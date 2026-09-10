// Handlers for § 2 — Avisos de Despacho.

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import {
  avisoToHomecenterRequest,
  db,
  generarEan128,
  nextAvisoId,
  nextLogId,
  nowIso,
  paginate,
} from '../data/db'
import type { AvisoRecord, OrdenRecord } from '../data/db'
import type {
  AvisoDespachoDetalle,
  AvisoDespachoResultado,
  AvisoDespachoResumen,
  AvisoEan128Response,
  AvisoIntentosResponse,
  CrearAvisoDespachoRequest,
  Ean128Contenedor,
  EstadoAviso,
  HomecenterResultado,
  ReenviarAvisoRequest,
} from '#/api/types'

function cantidadContenedores(aviso: AvisoRecord): number {
  return aviso.tiendas.reduce((sum, t) => sum + t.contenedores.length, 0)
}

function toResumen(aviso: AvisoRecord): AvisoDespachoResumen {
  return {
    avisoId: aviso.avisoId,
    ordenCompra: aviso.ordenCompra,
    fechaRealDespacho: aviso.fechaRealDespacho,
    cantidadContenedores: cantidadContenedores(aviso),
    estado: aviso.estado,
    fechaEnvio: aviso.fechaEnvio,
  }
}

function toDetalle(aviso: AvisoRecord): AvisoDespachoDetalle {
  return {
    avisoId: aviso.avisoId,
    ordenCompra: aviso.ordenCompra,
    fechaRealDespacho: aviso.fechaRealDespacho,
    enviarInmediatamente: aviso.enviarInmediatamente,
    tiendas: aviso.tiendas,
    estado: aviso.estado,
    intentos: aviso.intentos,
    integracionLogId: aviso.integracionLogId,
  }
}

function toResultado(aviso: AvisoRecord): AvisoDespachoResultado {
  return {
    avisoId: aviso.avisoId,
    ordenCompra: aviso.ordenCompra,
    estado: aviso.estado,
    homecenter: aviso.homecenter,
    intentos: aviso.intentos,
  }
}

/** solicitada por (eanTienda|eanSku) tomada de la orden. */
function solicitadaMap(orden: OrdenRecord): Map<string, number> {
  const map = new Map<string, number>()
  for (const tienda of orden.tiendas) {
    for (const prod of tienda.productos) {
      map.set(`${tienda.eanTienda}|${prod.eanSku}`, prod.cantidadSolicitada)
    }
  }
  return map
}

/** Replica la validación que Homecenter aplica en su lado (§ 2.1). */
function validarCantidades(
  body: CrearAvisoDespachoRequest,
  orden: OrdenRecord,
): Array<unknown> {
  const solicitada = solicitadaMap(orden)
  const acumulado = new Map<string, number>()
  const errores: Array<unknown> = []

  for (const tienda of body.tiendas) {
    for (const contenedor of tienda.contenedores) {
      for (const prod of contenedor.productos) {
        const key = `${tienda.eanTienda}|${prod.eanSku}`
        const total = (acumulado.get(key) ?? 0) + prod.cantidad
        acumulado.set(key, total)
        const max = solicitada.get(key)
        if (max === undefined) {
          errores.push({
            eanSku: prod.eanSku,
            eanTienda: tienda.eanTienda,
            mensaje: `El SKU ${prod.eanSku} no pertenece a la tienda ${tienda.eanTienda} en la orden ${orden.ordenCompra}.`,
          })
        } else if (total > max) {
          errores.push({
            eanSku: prod.eanSku,
            eanTienda: tienda.eanTienda,
            mensaje: `El producto:'${prod.eanSku}' dirigido a la tienda:'${tienda.eanTienda}' supera la cantidad solicitada:'${max}'`,
          })
        }
      }
    }
  }
  return errores
}

/** Homecenter "responde": ENVIADO salvo que una línea llegue al 100% de lo pedido. */
function simularHomecenter(
  aviso: AvisoRecord,
  orden: OrdenRecord,
): { estado: EstadoAviso; homecenter: HomecenterResultado } {
  // Trigger de prueba: un contenedor llamado "*ERR*" fuerza caída de Homecenter.
  const fuerzaError = aviso.tiendas.some((t) =>
    t.contenedores.some((c) => c.contenedor.toUpperCase().includes('ERR')),
  )
  if (fuerzaError) {
    return {
      estado: 'ERROR_ENVIO',
      homecenter: {
        isError: true,
        errorMessage: 'Homecenter no disponible (timeout tras 30s)',
      },
    }
  }

  const solicitada = solicitadaMap(orden)
  const novedades: HomecenterResultado['detalle'] = []
  for (const tienda of aviso.tiendas) {
    for (const contenedor of tienda.contenedores) {
      for (const prod of contenedor.productos) {
        const max = solicitada.get(`${tienda.eanTienda}|${prod.eanSku}`)
        if (max !== undefined && prod.cantidad >= max) {
          novedades.push({
            eanSku: prod.eanSku,
            eanTienda: tienda.eanTienda,
            mensaje: `El producto:'${prod.eanSku}' dirigido a la tienda:'${tienda.eanTienda}' supera la cantidad solicitada:'${max}'`,
          })
        }
      }
    }
  }

  if (novedades.length > 0) {
    return {
      estado: 'CON_NOVEDAD',
      homecenter: {
        isError: false,
        errorMessage: 'Se presentaron errores en algunos items ver resultado',
        detalle: novedades,
      },
    }
  }
  return {
    estado: 'ENVIADO',
    homecenter: { isError: false, errorMessage: null },
  }
}

function registrarIntento(aviso: AvisoRecord, estado: EstadoAviso): string {
  const when = new Date()
  const logId = nextLogId(db, when)
  aviso.intentos += 1
  aviso.integracionLogId = logId
  aviso.fechaEnvio = nowIso()
  aviso.historialIntentos.push({
    numero: aviso.intentos,
    fecha: nowIso(),
    estado,
    integracionLogId: logId,
  })
  db.logs.unshift({
    integracionLogId: logId,
    tipo: 'AVISO_DESPACHO',
    fecha: nowIso(),
    estado:
      estado === 'ENVIADO'
        ? 'EXITOSO'
        : estado === 'CON_NOVEDAD'
          ? 'CON_NOVEDAD'
          : 'FALLIDO',
    referencia: aviso.avisoId,
    requestEnviado: avisoToHomecenterRequest(aviso),
    respuestaRecibida: aviso.homecenter,
  })
  return logId
}

export const avisosHandlers = [
  // § 2.2
  http.get(`${API}/avisos-despacho`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const { page, pageSize } = readPageParams(url)
    const ordenCompra = url.searchParams.get('ordenCompra')
    const estado = url.searchParams.get('estado')
    const fechaDesde = url.searchParams.get('fechaDesde')
    const fechaHasta = url.searchParams.get('fechaHasta')

    const rows = db.avisos
      .filter((a) => (ordenCompra ? a.ordenCompra.includes(ordenCompra) : true))
      .filter((a) => (estado ? a.estado === estado : true))
      .filter((a) => withinRange(a.fechaRealDespacho, fechaDesde, fechaHasta))
      .sort((a, b) =>
        (b.fechaEnvio ?? b.fechaRealDespacho).localeCompare(
          a.fechaEnvio ?? a.fechaRealDespacho,
        ),
      )
      .map(toResumen)

    return HttpResponse.json(paginate(rows, page, pageSize))
  }),

  // § 2.1
  http.post(`${API}/avisos-despacho`, async ({ request }) => {
    await latency()
    const body = (await request.json()) as CrearAvisoDespachoRequest
    const orden = db.ordenes.find((o) => o.ordenCompra === body.ordenCompra)
    if (!orden) {
      return apiError(
        404,
        'ORDEN_NO_ENCONTRADA',
        `La orden de compra ${body.ordenCompra} no existe en el sistema.`,
      )
    }

    const errores = validarCantidades(body, orden)
    if (errores.length > 0) {
      return apiError(
        400,
        'CANTIDAD_EXCEDE_SOLICITADO',
        'Una o más líneas superan la cantidad solicitada en la orden.',
        errores,
      )
    }

    const aviso: AvisoRecord = {
      avisoId: nextAvisoId(db, body.ordenCompra),
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
      db.avisos.push(aviso)
      return HttpResponse.json<AvisoDespachoResultado>(toResultado(aviso), {
        status: 201,
      })
    }

    const { estado, homecenter } = simularHomecenter(aviso, orden)
    aviso.homecenter = homecenter

    if (estado === 'ERROR_ENVIO') {
      aviso.estado = 'ERROR_ENVIO'
      registrarIntento(aviso, 'ERROR_ENVIO')
      db.avisos.push(aviso)
      return apiError(
        502,
        'HOMECENTER_NO_DISPONIBLE',
        'No se pudo contactar a Homecenter. El aviso quedó en ERROR_ENVIO para reintento.',
        [{ avisoId: aviso.avisoId }],
      )
    }

    aviso.estado = estado
    registrarIntento(aviso, estado)
    db.avisos.push(aviso)
    return HttpResponse.json<AvisoDespachoResultado>(toResultado(aviso), {
      status: 201,
    })
  }),

  // § 2.4
  http.get(`${API}/avisos-despacho/:avisoId/ean128`, async ({ params }) => {
    await latency()
    const aviso = db.avisos.find((a) => a.avisoId === String(params.avisoId))
    if (!aviso) {
      return apiError(
        404,
        'AVISO_NO_ENCONTRADO',
        'Aviso de despacho no encontrado.',
      )
    }
    const orden = db.ordenes.find((o) => o.ordenCompra === aviso.ordenCompra)
    const solicitada = orden ? solicitadaMap(orden) : new Map<string, number>()

    const contenedores: Array<Ean128Contenedor> = []
    for (const tienda of aviso.tiendas) {
      for (const contenedor of tienda.contenedores) {
        for (const prod of contenedor.productos) {
          contenedores.push({
            contenedor: contenedor.contenedor,
            eanSku: prod.eanSku,
            cantidadSolicitada:
              solicitada.get(`${tienda.eanTienda}|${prod.eanSku}`) ??
              prod.cantidad,
            cantidadDespachada: prod.cantidad,
            peso: prod.peso,
            volumen: prod.volumen,
            ean128: generarEan128(contenedor.contenedor, prod.eanSku),
          })
        }
      }
    }
    return HttpResponse.json<AvisoEan128Response>({
      avisoId: aviso.avisoId,
      contenedores,
    })
  }),

  // § 2.6
  http.get(`${API}/avisos-despacho/:avisoId/intentos`, async ({ params }) => {
    await latency()
    const aviso = db.avisos.find((a) => a.avisoId === String(params.avisoId))
    if (!aviso) {
      return apiError(
        404,
        'AVISO_NO_ENCONTRADO',
        'Aviso de despacho no encontrado.',
      )
    }
    return HttpResponse.json<AvisoIntentosResponse>({
      avisoId: aviso.avisoId,
      intentos: aviso.historialIntentos,
    })
  }),

  // § 2.5
  http.post(
    `${API}/avisos-despacho/:avisoId/reenviar`,
    async ({ params, request }) => {
      await latency()
      const aviso = db.avisos.find((a) => a.avisoId === String(params.avisoId))
      if (!aviso) {
        return apiError(
          404,
          'AVISO_NO_ENCONTRADO',
          'Aviso de despacho no encontrado.',
        )
      }
      if (aviso.estado === 'ENVIADO' || aviso.estado === 'BORRADOR') {
        return apiError(
          409,
          'AVISO_NO_REENVIABLE',
          `El aviso ${aviso.avisoId} está en estado ${aviso.estado}; el reenvío solo aplica a avisos con problema.`,
        )
      }

      const body = (await request.json()) as ReenviarAvisoRequest
      for (const correccion of body.correcciones) {
        for (const tienda of aviso.tiendas) {
          if (tienda.eanTienda !== correccion.eanTienda) continue
          for (const contenedor of tienda.contenedores) {
            if (contenedor.contenedor !== correccion.contenedor) continue
            for (const prod of contenedor.productos) {
              if (prod.eanSku === correccion.eanSku) {
                prod.cantidad = correccion.cantidadCorregida
              }
            }
          }
        }
      }

      const orden = db.ordenes.find((o) => o.ordenCompra === aviso.ordenCompra)
      const { estado, homecenter } = orden
        ? simularHomecenter(aviso, orden)
        : { estado: 'ENVIADO' as EstadoAviso, homecenter: aviso.homecenter }
      aviso.homecenter = homecenter
      aviso.estado = estado
      registrarIntento(aviso, estado)

      return HttpResponse.json<AvisoDespachoResultado>(toResultado(aviso), {
        status: 200,
      })
    },
  ),

  // § 2.3
  http.get(`${API}/avisos-despacho/:avisoId`, async ({ params }) => {
    await latency()
    const aviso = db.avisos.find((a) => a.avisoId === String(params.avisoId))
    if (!aviso) {
      return apiError(
        404,
        'AVISO_NO_ENCONTRADO',
        'Aviso de despacho no encontrado.',
      )
    }
    return HttpResponse.json(toDetalle(aviso))
  }),
]
