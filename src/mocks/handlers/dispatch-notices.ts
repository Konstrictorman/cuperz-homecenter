// Handlers for § 2 — Dispatch Notices (Platform → Homecenter).

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import {
  db,
  dispatchNoticeToHomecenterRequest,
  generateEan128,
  nextDispatchNoticeId,
  nextLogId,
  nowIso,
  paginate,
} from '../data/db'
import type { DispatchNoticeRecord, PurchaseOrderRecord } from '../data/db'
import type {
  CreateDispatchNoticeRequest,
  DispatchNoticeAttemptsResponse,
  DispatchNoticeDetail,
  DispatchNoticeEan128Response,
  DispatchNoticeResult,
  DispatchNoticeStatus,
  DispatchNoticeSummary,
  Ean128Container,
  HomecenterResult,
  ResendDispatchNoticeRequest,
} from '#/api/types'

function containerCount(notice: DispatchNoticeRecord): number {
  return notice.tiendas.reduce((sum, t) => sum + t.contenedores.length, 0)
}

function toSummary(notice: DispatchNoticeRecord): DispatchNoticeSummary {
  return {
    avisoId: notice.avisoId,
    ordenCompra: notice.ordenCompra,
    fechaRealDespacho: notice.fechaRealDespacho,
    cantidadContenedores: containerCount(notice),
    estado: notice.estado,
    fechaEnvio: notice.fechaEnvio,
  }
}

function toDetail(notice: DispatchNoticeRecord): DispatchNoticeDetail {
  return {
    avisoId: notice.avisoId,
    ordenCompra: notice.ordenCompra,
    fechaRealDespacho: notice.fechaRealDespacho,
    enviarInmediatamente: notice.enviarInmediatamente,
    tiendas: notice.tiendas,
    estado: notice.estado,
    intentos: notice.intentos,
    integracionLogId: notice.integracionLogId,
  }
}

function toResult(notice: DispatchNoticeRecord): DispatchNoticeResult {
  return {
    avisoId: notice.avisoId,
    ordenCompra: notice.ordenCompra,
    estado: notice.estado,
    homecenter: notice.homecenter,
    intentos: notice.intentos,
  }
}

/** Requested qty per `eanTienda|eanSku`, taken from the order. */
function requestedQtyMap(order: PurchaseOrderRecord): Map<string, number> {
  const map = new Map<string, number>()
  for (const store of order.tiendas) {
    for (const product of store.productos) {
      map.set(
        `${store.eanTienda}|${product.eanSku}`,
        product.cantidadSolicitada,
      )
    }
  }
  return map
}

/** Replays the check Homecenter applies on its side (§ 2.1). */
function validateQuantities(
  body: CreateDispatchNoticeRequest,
  order: PurchaseOrderRecord,
): Array<unknown> {
  const requested = requestedQtyMap(order)
  const running = new Map<string, number>()
  const errors: Array<unknown> = []

  for (const store of body.tiendas) {
    for (const container of store.contenedores) {
      for (const product of container.productos) {
        const key = `${store.eanTienda}|${product.eanSku}`
        const total = (running.get(key) ?? 0) + product.cantidad
        running.set(key, total)
        const max = requested.get(key)
        if (max === undefined) {
          errors.push({
            eanSku: product.eanSku,
            eanTienda: store.eanTienda,
            mensaje: `El SKU ${product.eanSku} no pertenece a la tienda ${store.eanTienda} en la orden ${order.ordenCompra}.`,
          })
        } else if (total > max) {
          errors.push({
            eanSku: product.eanSku,
            eanTienda: store.eanTienda,
            mensaje: `El producto:'${product.eanSku}' dirigido a la tienda:'${store.eanTienda}' supera la cantidad solicitada:'${max}'`,
          })
        }
      }
    }
  }
  return errors
}

/** Homecenter "replies": ENVIADO unless a line reaches 100% of what was ordered. */
function simulateHomecenter(
  notice: DispatchNoticeRecord,
  order: PurchaseOrderRecord,
): { estado: DispatchNoticeStatus; homecenter: HomecenterResult } {
  // Test trigger: a container named "*ERR*" forces a Homecenter outage.
  const forceError = notice.tiendas.some((t) =>
    t.contenedores.some((c) => c.contenedor.toUpperCase().includes('ERR')),
  )
  if (forceError) {
    return {
      estado: 'ERROR_ENVIO',
      homecenter: {
        isError: true,
        errorMessage: 'Homecenter no disponible (timeout tras 30s)',
      },
    }
  }

  const requested = requestedQtyMap(order)
  const issues: HomecenterResult['detalle'] = []
  for (const store of notice.tiendas) {
    for (const container of store.contenedores) {
      for (const product of container.productos) {
        const max = requested.get(`${store.eanTienda}|${product.eanSku}`)
        if (max !== undefined && product.cantidad >= max) {
          issues.push({
            eanSku: product.eanSku,
            eanTienda: store.eanTienda,
            mensaje: `El producto:'${product.eanSku}' dirigido a la tienda:'${store.eanTienda}' supera la cantidad solicitada:'${max}'`,
          })
        }
      }
    }
  }

  if (issues.length > 0) {
    return {
      estado: 'CON_NOVEDAD',
      homecenter: {
        isError: false,
        errorMessage: 'Se presentaron errores en algunos items ver resultado',
        detalle: issues,
      },
    }
  }
  return {
    estado: 'ENVIADO',
    homecenter: { isError: false, errorMessage: null },
  }
}

function recordAttempt(
  notice: DispatchNoticeRecord,
  status: DispatchNoticeStatus,
): string {
  const when = new Date()
  const logId = nextLogId(db, when)
  notice.intentos += 1
  notice.integracionLogId = logId
  notice.fechaEnvio = nowIso()
  notice.historialIntentos.push({
    numero: notice.intentos,
    fecha: nowIso(),
    estado: status,
    integracionLogId: logId,
  })
  db.logs.unshift({
    integracionLogId: logId,
    tipo: 'AVISO_DESPACHO',
    fecha: nowIso(),
    estado:
      status === 'ENVIADO'
        ? 'EXITOSO'
        : status === 'CON_NOVEDAD'
          ? 'CON_NOVEDAD'
          : 'FALLIDO',
    referencia: notice.avisoId,
    requestEnviado: dispatchNoticeToHomecenterRequest(notice),
    respuestaRecibida: notice.homecenter,
  })
  return logId
}

export const dispatchNoticesHandlers = [
  // § 2.2
  http.get(`${API}/avisos-despacho`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const { page, pageSize } = readPageParams(url)
    const ordenCompra = url.searchParams.get('ordenCompra')
    const estado = url.searchParams.get('estado')
    const fechaDesde = url.searchParams.get('fechaDesde')
    const fechaHasta = url.searchParams.get('fechaHasta')

    const rows = db.dispatchNotices
      .filter((a) => (ordenCompra ? a.ordenCompra.includes(ordenCompra) : true))
      .filter((a) => (estado ? a.estado === estado : true))
      .filter((a) => withinRange(a.fechaRealDespacho, fechaDesde, fechaHasta))
      .sort((a, b) =>
        (b.fechaEnvio ?? b.fechaRealDespacho).localeCompare(
          a.fechaEnvio ?? a.fechaRealDespacho,
        ),
      )
      .map(toSummary)

    return HttpResponse.json(paginate(rows, page, pageSize))
  }),

  // § 2.1
  http.post(`${API}/avisos-despacho`, async ({ request }) => {
    await latency()
    const body = (await request.json()) as CreateDispatchNoticeRequest
    const order = db.purchaseOrders.find(
      (o) => o.ordenCompra === body.ordenCompra,
    )
    if (!order) {
      return apiError(
        404,
        'ORDEN_NO_ENCONTRADA',
        `La orden de compra ${body.ordenCompra} no existe en el sistema.`,
      )
    }

    const errors = validateQuantities(body, order)
    if (errors.length > 0) {
      return apiError(
        400,
        'CANTIDAD_EXCEDE_SOLICITADO',
        'Una o más líneas superan la cantidad solicitada en la orden.',
        errors,
      )
    }

    const notice: DispatchNoticeRecord = {
      avisoId: nextDispatchNoticeId(db, body.ordenCompra),
      ordenCompra: body.ordenCompra,
      fechaRealDespacho: body.fechaRealDespacho,
      enviarInmediatamente: body.enviarInmediatamente,
      tiendas: body.tiendas,
      estado: 'BORRADOR',
      intentos: 0,
      integracionLogId: null,
      fechaEnvio: null,
      homecenter: { isError: false, errorMessage: null },
      historialIntentos: [],
    }

    if (!body.enviarInmediatamente) {
      db.dispatchNotices.push(notice)
      return HttpResponse.json<DispatchNoticeResult>(toResult(notice), {
        status: 201,
      })
    }

    const { estado, homecenter } = simulateHomecenter(notice, order)
    notice.homecenter = homecenter

    if (estado === 'ERROR_ENVIO') {
      notice.estado = 'ERROR_ENVIO'
      recordAttempt(notice, 'ERROR_ENVIO')
      db.dispatchNotices.push(notice)
      return apiError(
        502,
        'HOMECENTER_NO_DISPONIBLE',
        'No se pudo contactar a Homecenter. El aviso quedó en ERROR_ENVIO para reintento.',
        [{ avisoId: notice.avisoId }],
      )
    }

    notice.estado = estado
    recordAttempt(notice, estado)
    db.dispatchNotices.push(notice)
    return HttpResponse.json<DispatchNoticeResult>(toResult(notice), {
      status: 201,
    })
  }),

  // § 2.4
  http.get(`${API}/avisos-despacho/:avisoId/ean128`, async ({ params }) => {
    await latency()
    const notice = db.dispatchNotices.find(
      (a) => a.avisoId === String(params.avisoId),
    )
    if (!notice) {
      return apiError(
        404,
        'AVISO_NO_ENCONTRADO',
        'Aviso de despacho no encontrado.',
      )
    }
    const order = db.purchaseOrders.find(
      (o) => o.ordenCompra === notice.ordenCompra,
    )
    const requested = order ? requestedQtyMap(order) : new Map<string, number>()

    const contenedores: Array<Ean128Container> = []
    for (const store of notice.tiendas) {
      for (const container of store.contenedores) {
        for (const product of container.productos) {
          contenedores.push({
            contenedor: container.contenedor,
            eanSku: product.eanSku,
            cantidadSolicitada:
              requested.get(`${store.eanTienda}|${product.eanSku}`) ??
              product.cantidad,
            cantidadDespachada: product.cantidad,
            peso: product.peso,
            volumen: product.volumen,
            ean128: generateEan128(container.contenedor, product.eanSku),
          })
        }
      }
    }
    return HttpResponse.json<DispatchNoticeEan128Response>({
      avisoId: notice.avisoId,
      contenedores,
    })
  }),

  // § 2.6
  http.get(`${API}/avisos-despacho/:avisoId/intentos`, async ({ params }) => {
    await latency()
    const notice = db.dispatchNotices.find(
      (a) => a.avisoId === String(params.avisoId),
    )
    if (!notice) {
      return apiError(
        404,
        'AVISO_NO_ENCONTRADO',
        'Aviso de despacho no encontrado.',
      )
    }
    return HttpResponse.json<DispatchNoticeAttemptsResponse>({
      avisoId: notice.avisoId,
      intentos: notice.historialIntentos,
    })
  }),

  // § 2.5
  http.post(
    `${API}/avisos-despacho/:avisoId/reenviar`,
    async ({ params, request }) => {
      await latency()
      const notice = db.dispatchNotices.find(
        (a) => a.avisoId === String(params.avisoId),
      )
      if (!notice) {
        return apiError(
          404,
          'AVISO_NO_ENCONTRADO',
          'Aviso de despacho no encontrado.',
        )
      }
      if (notice.estado === 'ENVIADO' || notice.estado === 'BORRADOR') {
        return apiError(
          409,
          'AVISO_NO_REENVIABLE',
          `El aviso ${notice.avisoId} está en estado ${notice.estado}; el reenvío solo aplica a avisos con problema.`,
        )
      }

      const body = (await request.json()) as ResendDispatchNoticeRequest
      for (const correction of body.correcciones) {
        for (const store of notice.tiendas) {
          if (store.eanTienda !== correction.eanTienda) continue
          for (const container of store.contenedores) {
            if (container.contenedor !== correction.contenedor) continue
            for (const product of container.productos) {
              if (product.eanSku === correction.eanSku) {
                product.cantidad = correction.cantidadCorregida
              }
            }
          }
        }
      }

      const order = db.purchaseOrders.find(
        (o) => o.ordenCompra === notice.ordenCompra,
      )
      const { estado, homecenter } = order
        ? simulateHomecenter(notice, order)
        : {
            estado: 'ENVIADO' as DispatchNoticeStatus,
            homecenter: notice.homecenter,
          }
      notice.homecenter = homecenter
      notice.estado = estado
      recordAttempt(notice, estado)

      return HttpResponse.json<DispatchNoticeResult>(toResult(notice), {
        status: 200,
      })
    },
  ),

  // § 2.3
  http.get(`${API}/avisos-despacho/:avisoId`, async ({ params }) => {
    await latency()
    const notice = db.dispatchNotices.find(
      (a) => a.avisoId === String(params.avisoId),
    )
    if (!notice) {
      return apiError(
        404,
        'AVISO_NO_ENCONTRADO',
        'Aviso de despacho no encontrado.',
      )
    }
    return HttpResponse.json(toDetail(notice))
  }),
]
