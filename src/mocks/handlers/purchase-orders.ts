// Handlers for § 1 — Purchase Orders (Homecenter → Platform).

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import {
  db,
  MOCK_ESTADO_SKU_CODE,
  nextLogId,
  nextSyncId,
  nowIso,
  paginate,
} from '../data/db'
import type { PurchaseOrderRecord } from '../data/db'
import type {
  PurchaseOrderDetail,
  PurchaseOrderDetailCabecera,
  PurchaseOrderStore,
  PurchaseOrderSummary,
  ReprocessOrderResponse,
  SyncPurchaseOrdersRequest,
  SyncPurchaseOrdersResponse,
} from '#/api/types'

function totalRequested(order: PurchaseOrderRecord): number {
  return order.productos.reduce((sum, p) => sum + p.cantidadSolicitada, 0)
}

function toSummary(order: PurchaseOrderRecord): PurchaseOrderSummary {
  return {
    ordenCompra: order.ordenCompra,
    eanPuntoEntrega: order.eanPuntoEntrega,
    cliente: order.cliente,
    ciudadEntrega: order.ciudadEntrega,
    cantidadTotOc: totalRequested(order),
    costoTotOc: order.costoTotalOc,
    estadoOc: order.estadoOc,
    estado: order.estado,
    fechaTransmision: order.fechaTransmision,
    fechaMinEntrega: order.fechaMinEntrega,
    fechaMaxEntrega: order.fechaMaxEntrega,
    fechaDespacho: order.fechaDespacho,
    sticker: order.sticker ?? '-1',
    observaciones: order.observaciones,
    numeroPedido: order.numPedido,
    // Semantics unconfirmed — always `null` in every real response sampled
    // so far (2026-10-13). See `PurchaseOrderSummary.fechaOrden`.
    fechaOrden: null,
  }
}

/** Inverts Homecenter's raw `productos[].tiendas[]` nesting (as persisted on
 *  `PurchaseOrderRecord`) into the `/api/v1` contract's `tiendas[].productos[]`
 *  — the same inversion the real backend performs at this boundary.
 *  `productoId`/`detalleId` are platform-only identifiers assigned here:
 *  `productoId` stable per distinct SKU on the order (shared across the
 *  stores it ships to, matching how a real response repeats it), `detalleId`
 *  unique per store/product line — the mock has no real source for either,
 *  since `PurchaseOrderRecord` never carried them. */
function toStoreGroupedProducts(
  productos: PurchaseOrderRecord['productos'],
): Array<PurchaseOrderStore> {
  const byTienda = new Map<string, PurchaseOrderStore>()
  const productoIdBySku = new Map<string, number>()
  let nextDetalleId = 1

  for (const producto of productos) {
    if (!productoIdBySku.has(producto.eanSku)) {
      productoIdBySku.set(producto.eanSku, productoIdBySku.size + 1)
    }
    const productoId = productoIdBySku.get(producto.eanSku) as number

    for (const tienda of producto.tiendas) {
      let store = byTienda.get(tienda.eanTienda)
      if (!store) {
        store = {
          eanTienda: tienda.eanTienda,
          nombreTienda: tienda.nombreTienda,
          productos: [],
        }
        byTienda.set(tienda.eanTienda, store)
      }
      store.productos.push({
        productoId,
        detalleId: nextDetalleId++,
        sku: producto.skuHomecenter,
        producto: producto.descripcion,
        eanProducto: producto.eanSku,
        cantidad: tienda.cantidad,
        cantidadSku: producto.cantidadSolicitada,
        cantidadCancelada: producto.cantidadCancelada,
        cantidadDevueltaSku: producto.cantidadDevuelta,
        estadoSku: MOCK_ESTADO_SKU_CODE[producto.estadoLinea],
        estadoDetalle: producto.estadoLinea,
        costoSku: producto.costoUnitario,
        unidadVenta: producto.unidadVenta,
        observaciones: null,
      })
    }
  }
  return Array.from(byTienda.values())
}

function toCabecera(order: PurchaseOrderRecord): PurchaseOrderDetailCabecera {
  return {
    ordenCompra: order.ordenCompra,
    cantidadTotOc: totalRequested(order),
    costoTotOc: order.costoTotalOc,
    sticker: order.sticker ?? '-1',
    estadoOc: order.estadoOc,
    fechaTransmision: order.fechaTransmision,
    cliente: order.cliente,
    ciudadEntrega: order.ciudadEntrega,
    fechaMinEntrega: order.fechaMinEntrega,
    fechaMaxEntrega: order.fechaMaxEntrega,
    fechaDespacho: order.fechaDespacho,
    fechaCancelacion: order.fechaCancelacion,
    transportadora: order.transportadora,
    tipoOc: order.tipoOc,
    notaPedido: order.notaPedido,
    cedula: order.cedulaComprador,
    emailCliente: order.emailCliente,
    telefonoCliente: order.telefonoCliente,
    barrioEntrega: order.barrioEntrega,
    departamentoEntrega: order.departamentoEntrega,
    direccionEntrega: order.direccionEntrega,
    barrioFac: order.barrioFac,
    ciudadFac: order.ciudadFac,
    departamentoFac: order.departamentoFac,
    direccionFac: order.direccionFac,
    tiendaVenta: order.eanTiendaVenta,
    tiendaFacturacion: order.eanTiendaFacturacion,
    localidad: order.localidad,
    eanEmpresaCompradora: order.eanEmpresaCompradora,
    tipoDeOrden: order.tipoDeOrden,
    tipoEntrega: order.tipoEntrega,
    codigoDaneCe: order.codigoDaneEntrega,
    observacionesNpc: order.observacionesNpc,
    observacionesNpl: order.observacionesNpl,
    clienteRecibe: order.clienteRecibe,
    eanPuntoEntrega: order.eanPuntoEntrega,
    estado: order.estado,
    observaciones: order.observaciones,
    numeroPedido: order.numPedido,
    codigoSesionRecibo: order.codigoSesionRecibo,
    tipoDocumento: order.tipoDocumento,
  }
}

function toDetail(order: PurchaseOrderRecord): PurchaseOrderDetail {
  return {
    cabecera: toCabecera(order),
    tiendas: toStoreGroupedProducts(order.productos),
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
  'ordenCompra;eanPuntoEntrega;cliente;ciudadEntrega;cantidadTotOc;estado;fechaTransmision'

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
          r.cantidadTotOc,
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
