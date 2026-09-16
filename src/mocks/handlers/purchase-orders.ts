// Handlers for § 1 — Purchase Orders (Homecenter → Platform).

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import { db, nextLogId, nextSyncId, nowIso, paginate } from '../data/db'
import type { PurchaseOrderRecord } from '../data/db'
import type {
  PurchaseOrderDetail,
  PurchaseOrderSummary,
  ReprocessOrderResponse,
  SyncPurchaseOrdersRequest,
  SyncPurchaseOrdersResponse,
} from '#/api/types'

function totalRequested(order: PurchaseOrderRecord): number {
  return order.productos.reduce((sum, p) => sum + p.cantidadSolicitada, 0)
}

/** Distinct store count across all lines — a product-first order can repeat
 *  the same store across several lines, so this can't just be an array length
 *  the way it could when stores were the outer level. */
function distinctStoreCount(order: PurchaseOrderRecord): number {
  const eans = new Set<string>()
  for (const producto of order.productos) {
    for (const tienda of producto.tiendas) eans.add(tienda.eanTienda)
  }
  return eans.size
}

function toSummary(order: PurchaseOrderRecord): PurchaseOrderSummary {
  return {
    ordenCompra: order.ordenCompra,
    eanPuntoEntrega: order.eanPuntoEntrega,
    cliente: order.cliente,
    ciudadEntrega: order.ciudadEntrega,
    cantidadTiendas: distinctStoreCount(order),
    cantidadTotalSolicitada: totalRequested(order),
    costoTotalOc: order.costoTotalOc,
    estado: order.estado,
    fechaTransmision: order.fechaTransmision,
    ultimaActualizacion: order.ultimaActualizacion,
  }
}

function toDetail(order: PurchaseOrderRecord): PurchaseOrderDetail {
  return {
    ordenCompra: order.ordenCompra,
    eanPuntoEntrega: order.eanPuntoEntrega,
    cliente: order.cliente,
    direccionEntrega: order.direccionEntrega,
    barrioEntrega: order.barrioEntrega,
    departamentoEntrega: order.departamentoEntrega,
    codigoDaneEntrega: order.codigoDaneEntrega,
    facturacion: order.facturacion,
    estado: order.estado,
    codigoSesionRecibo: order.codigoSesionRecibo,
    productos: order.productos,
    costoTotalOc: order.costoTotalOc,
    transportadora: order.transportadora,
    fechaMinEntrega: order.fechaMinEntrega,
    fechaMaxEntrega: order.fechaMaxEntrega,
    fechaCancelacion: order.fechaCancelacion,
    sticker: order.sticker,
    tipoOc: order.tipoOc,
    tipoDocumento: order.tipoDocumento,
    notaPedido: order.notaPedido,
    cedulaComprador: order.cedulaComprador,
    emailCliente: order.emailCliente,
    telefonoCliente: order.telefonoCliente,
    clienteRecibe: order.clienteRecibe,
    eanTiendaVenta: order.eanTiendaVenta,
    eanTiendaFacturacion: order.eanTiendaFacturacion,
    localidad: order.localidad,
    eanEmpresaCompradora: order.eanEmpresaCompradora,
    tipoDeOrden: order.tipoDeOrden,
    tipoEntrega: order.tipoEntrega,
    observaciones: order.observaciones,
    observacionesNpc: order.observacionesNpc,
    observacionesNpl: order.observacionesNpl,
  }
}

function filterPurchaseOrders(url: URL): Array<PurchaseOrderRecord> {
  const ordenCompra = url.searchParams.get('ordenCompra')
  const estado = url.searchParams.get('estado')
  const fechaTransmisionDesde = url.searchParams.get('fechaTransmisionDesde')
  const fechaTransmisionHasta = url.searchParams.get('fechaTransmisionHasta')
  const storeEan = url.searchParams.get('tienda')

  return db.purchaseOrders
    .filter((o) => (ordenCompra ? o.ordenCompra.includes(ordenCompra) : true))
    .filter((o) => (estado ? o.estado === estado : true))
    .filter((o) =>
      withinRange(
        o.fechaTransmision,
        fechaTransmisionDesde,
        fechaTransmisionHasta,
      ),
    )
    .filter((o) =>
      storeEan
        ? o.productos.some((p) =>
            p.tiendas.some((t) => t.eanTienda === storeEan),
          )
        : true,
    )
    .sort((a, b) => b.fechaTransmision.localeCompare(a.fechaTransmision))
}

const CSV_HEADER =
  'ordenCompra;eanPuntoEntrega;cliente;ciudadEntrega;cantidadTiendas;cantidadTotalSolicitada;estado;fechaTransmision'

export const purchaseOrdersHandlers = [
  // § 1.1
  http.get(`${API}/ordenes-compra`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const { page, pageSize } = readPageParams(url)
    const rows = filterPurchaseOrders(url).map(toSummary)
    return HttpResponse.json(paginate(rows, page, pageSize))
  }),

  // § 1.5 — must be registered before the `{ordenCompra}` param route.
  http.get(`${API}/ordenes-compra/export`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const rows = filterPurchaseOrders(url).map(toSummary)
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
          r.fechaTransmision,
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
    const body = (await request.json()) as SyncPurchaseOrdersRequest
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
        actualizadas: db.purchaseOrders.length,
      },
    })
    return HttpResponse.json<SyncPurchaseOrdersResponse>(
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
      const order = db.purchaseOrders.find((o) => o.ordenCompra === ordenCompra)
      if (!order) {
        return apiError(
          404,
          'ORDEN_NO_ENCONTRADA',
          `La orden de compra ${ordenCompra} no existe en el sistema.`,
        )
      }
      if (order.estado !== 'CON_ERROR') {
        return apiError(
          409,
          'REINTENTO_NO_PERMITIDO',
          `La orden ${ordenCompra} no está en estado CON_ERROR.`,
        )
      }
      if (order.intentos >= order.maxIntentos) {
        return apiError(
          409,
          'REINTENTO_NO_PERMITIDO',
          `La orden ${ordenCompra} alcanzó el máximo de ${order.maxIntentos} reintentos.`,
        )
      }
      order.intentos += 1
      order.estado = 'PROCESANDO'
      order.ultimaActualizacion = nowIso()
      return HttpResponse.json<ReprocessOrderResponse>({
        ordenCompra,
        estado: 'PROCESANDO',
        intentoNumero: order.intentos + 1,
      })
    },
  ),

  // § 1.2
  http.get(`${API}/ordenes-compra/:ordenCompra`, async ({ params }) => {
    await latency()
    const ordenCompra = String(params.ordenCompra)
    const order = db.purchaseOrders.find((o) => o.ordenCompra === ordenCompra)
    if (!order) {
      return apiError(
        404,
        'ORDEN_NO_ENCONTRADA',
        `La orden de compra ${ordenCompra} no existe en el sistema.`,
      )
    }
    return HttpResponse.json(toDetail(order))
  }),
]
