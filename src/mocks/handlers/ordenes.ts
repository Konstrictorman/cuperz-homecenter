// Handlers for § 1 — Órdenes de Compra.

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import { db, nextLogId, nextSyncId, nowIso, paginate } from '../data/db'
import type { OrdenRecord } from '../data/db'
import type {
  OrdenCompraDetalle,
  OrdenCompraResumen,
  ReinyectarOrdenResponse,
  SincronizarOrdenesRequest,
  SincronizarOrdenesResponse,
} from '#/api/types'

function totalSolicitado(orden: OrdenRecord): number {
  return orden.tiendas.reduce(
    (sum, t) => sum + t.productos.reduce((s, p) => s + p.cantidadSolicitada, 0),
    0,
  )
}

function toResumen(orden: OrdenRecord): OrdenCompraResumen {
  return {
    ordenCompra: orden.ordenCompra,
    eanPuntoEntrega: orden.eanPuntoEntrega,
    cliente: orden.cliente,
    ciudadEntrega: orden.ciudadEntrega,
    cantidadTiendas: orden.tiendas.length,
    cantidadTotalSolicitada: totalSolicitado(orden),
    estado: orden.estado,
    fechaOrden: orden.fechaOrden,
    ultimaActualizacion: orden.ultimaActualizacion,
  }
}

function toDetalle(orden: OrdenRecord): OrdenCompraDetalle {
  return {
    ordenCompra: orden.ordenCompra,
    eanPuntoEntrega: orden.eanPuntoEntrega,
    cliente: orden.cliente,
    direccionEntrega: orden.direccionEntrega,
    estado: orden.estado,
    codigoSesionRecibo: orden.codigoSesionRecibo,
    tiendas: orden.tiendas,
  }
}

function filterOrdenes(url: URL): Array<OrdenRecord> {
  const ordenCompra = url.searchParams.get('ordenCompra')
  const estado = url.searchParams.get('estado')
  const fechaDesde = url.searchParams.get('fechaDesde')
  const fechaHasta = url.searchParams.get('fechaHasta')
  const tienda = url.searchParams.get('tienda')

  return db.ordenes
    .filter((o) => (ordenCompra ? o.ordenCompra.includes(ordenCompra) : true))
    .filter((o) => (estado ? o.estado === estado : true))
    .filter((o) => withinRange(o.fechaOrden, fechaDesde, fechaHasta))
    .filter((o) =>
      tienda ? o.tiendas.some((t) => t.eanTienda === tienda) : true,
    )
    .sort((a, b) => b.fechaOrden.localeCompare(a.fechaOrden))
}

const CSV_HEADER =
  'ordenCompra;eanPuntoEntrega;cliente;ciudadEntrega;cantidadTiendas;cantidadTotalSolicitada;estado;fechaOrden'

export const ordenesHandlers = [
  // § 1.1
  http.get(`${API}/ordenes-compra`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const { page, pageSize } = readPageParams(url)
    const rows = filterOrdenes(url).map(toResumen)
    return HttpResponse.json(paginate(rows, page, pageSize))
  }),

  // § 1.5 — must be registered before the `{ordenCompra}` param route.
  http.get(`${API}/ordenes-compra/export`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const rows = filterOrdenes(url).map(toResumen)
    const body = [
      CSV_HEADER,
      ...rows.map((r) =>
        [
          r.ordenCompra,
          r.eanPuntoEntrega,
          r.cliente,
          r.ciudadEntrega,
          r.cantidadTiendas,
          r.cantidadTotalSolicitada,
          r.estado,
          r.fechaOrden,
        ].join(';'),
      ),
    ].join('\n')
    return new HttpResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="ordenes-compra.csv"',
      },
    })
  }),

  // § 1.3
  http.post(`${API}/ordenes-compra/sincronizar`, async ({ request }) => {
    await latency()
    const body = (await request.json()) as SincronizarOrdenesRequest
    const when = new Date()
    const logId = nextLogId(db, when)
    db.logs.unshift({
      integracionLogId: logId,
      tipo: 'ORDEN_COMPRA_SYNC',
      fecha: nowIso(),
      estado: 'EXITOSO',
      referencia: `sync (${body.modo})`,
      requestEnviado: { metodo: 'GetOrdenesDeCompra', modo: body.modo },
      respuestaRecibida: {
        isError: false,
        errorMessage: null,
        nuevas: 0,
        actualizadas: db.ordenes.length,
      },
    })
    return HttpResponse.json<SincronizarOrdenesResponse>(
      { sincronizacionId: nextSyncId(db), estado: 'EN_PROCESO' },
      { status: 202 },
    )
  }),

  // § 1.4
  http.post(
    `${API}/ordenes-compra/:ordenCompra/reinyectar`,
    async ({ params }) => {
      await latency()
      const ordenCompra = String(params.ordenCompra)
      const orden = db.ordenes.find((o) => o.ordenCompra === ordenCompra)
      if (!orden) {
        return apiError(
          404,
          'ORDEN_NO_ENCONTRADA',
          `La orden de compra ${ordenCompra} no existe en el sistema.`,
        )
      }
      if (orden.estado !== 'CON_ERROR') {
        return apiError(
          409,
          'REINTENTO_NO_PERMITIDO',
          `La orden ${ordenCompra} no está en estado CON_ERROR.`,
        )
      }
      if (orden.intentos >= orden.maxIntentos) {
        return apiError(
          409,
          'REINTENTO_NO_PERMITIDO',
          `La orden ${ordenCompra} alcanzó el máximo de ${orden.maxIntentos} reintentos.`,
        )
      }
      orden.intentos += 1
      orden.estado = 'PROCESANDO'
      orden.ultimaActualizacion = nowIso()
      return HttpResponse.json<ReinyectarOrdenResponse>({
        ordenCompra,
        estado: 'PROCESANDO',
        intentoNumero: orden.intentos + 1,
      })
    },
  ),

  // § 1.2
  http.get(`${API}/ordenes-compra/:ordenCompra`, async ({ params }) => {
    await latency()
    const ordenCompra = String(params.ordenCompra)
    const orden = db.ordenes.find((o) => o.ordenCompra === ordenCompra)
    if (!orden) {
      return apiError(
        404,
        'ORDEN_NO_ENCONTRADA',
        `La orden de compra ${ordenCompra} no existe en el sistema.`,
      )
    }
    return HttpResponse.json(toDetalle(orden))
  }),
]
