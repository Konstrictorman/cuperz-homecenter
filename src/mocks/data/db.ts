// In-memory store that backs the MSW handlers. Seeded once per process with a
// fixed faker seed so the "fake but real-looking" data is stable across reloads.
// Everything here is mutable: the create/resend/reprocess handlers write back.
//
// Note: object *keys* and enum string *values* stay in Spanish because they
// mirror Homecenter's real contract (see docs/mock-api.md). Only identifiers
// (types, functions, variables) are in English.

import { faker } from '@faker-js/faker'
import {
  CARRIERS,
  CLIENTS,
  DELIVERY_CHANNELS,
  DELIVERY_POINTS,
  ORDER_FULFILLMENT_TYPES,
  ORDER_TYPES,
  PAYMENT_CONDITIONS,
  PRODUCTS,
  SALE_UNITS,
  STORES,
} from './catalog'
import type { StoreCatalogEntry } from './catalog'
import type {
  DispatchNoticeAttempt,
  DispatchNoticeStatus,
  DispatchNoticeStoreInput,
  HomecenterResult,
  IntegrationLogDetail,
  IsoDateTime,
  OrderLineStatus,
  OrderStatus,
  PurchaseOrderBillingAddress,
} from '#/api/types'

// --- Record shapes (superset of the API DTOs) ---

/** Per-product store allocation, mirroring Homecenter's raw
 *  `GetOrdenesDeCompra` nesting (`productos[].tiendas[]`) — this is what the
 *  backend actually receives/persists on sync. The `/api/v1` DTO
 *  (`PurchaseOrderDetail.tiendas`, see `#/api/types`) inverts this to
 *  store-first; that inversion happens at the response boundary in
 *  `mocks/handlers/purchase-orders.ts` (`toStoreGroupedProducts`), not here. */
export interface PurchaseOrderRecordStore {
  eanTienda: string
  nombreTienda: string
  cantidad: number
}

export interface PurchaseOrderLineItem {
  eanSku: string
  /** Homecenter's own internal product code (raw `SKU`), distinct from eanSku. */
  skuHomecenter: string
  descripcion: string
  cantidadSolicitada: number
  cantidadCancelada: number
  cantidadDevuelta: number
  estadoLinea: OrderLineStatus
  /** Raw `COSTO_SKU`. */
  costoUnitario: number
  /** Raw `CONDICION_PAGO`, trimmed. */
  condicionPago: string
  /** Raw `DESCUENTO_SKU`. */
  descuentoSku: number
  /** Raw `UNIDAD_VENTA`, trimmed. */
  unidadVenta: string
  tiendas: Array<PurchaseOrderRecordStore>
}

export interface PurchaseOrderRecord {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  ciudadEntrega: string
  direccionEntrega: string
  barrioEntrega: string
  departamentoEntrega: string
  codigoDaneEntrega: string
  facturacion: PurchaseOrderBillingAddress
  estado: OrderStatus
  codigoSesionRecibo: string | null
  fechaTransmision: string
  ultimaActualizacion: string
  productos: Array<PurchaseOrderLineItem>
  costoTotalOc: number
  transportadora: string
  fechaMinEntrega: IsoDateTime | null
  fechaMaxEntrega: IsoDateTime | null
  fechaCancelacion: IsoDateTime | null
  sticker: string | null
  tipoOc: string
  tipoDocumento: string | null
  notaPedido: string
  cedulaComprador: string
  emailCliente: string
  telefonoCliente: string
  clienteRecibe: string
  eanTiendaVenta: string
  eanTiendaFacturacion: string
  localidad: string
  eanEmpresaCompradora: string
  tipoDeOrden: string
  tipoEntrega: string
  observaciones: string
  observacionesNpc: string
  observacionesNpl: string
  /** Platform-only flag (not part of Homecenter's contract) — `true` once
   *  the order is more than 3 months past its `fechaTransmision`, i.e. it
   *  belongs to the archive rather than the day-to-day listing. Age-derived,
   *  not user-toggled — see `incluirHistorial` on `PurchaseOrdersQuery`. */
  archivada: boolean
  /** Platform-only field (not part of Homecenter's contract) — distinct from
   *  `notaPedido` (raw `NOTA_PEDIDO`). `null` when unset. */
  numPedido: string | null
  /** Reprocessing attempts (§ 1.4). */
  intentos: number
  maxIntentos: number
}

export interface DispatchNoticeRecord {
  avisoId: string
  ordenCompra: string
  fechaRealDespacho: string
  enviarInmediatamente: boolean
  tiendas: Array<DispatchNoticeStoreInput>
  estado: DispatchNoticeStatus
  intentos: number
  integracionLogId: string | null
  fechaEnvio: string | null
  homecenter: HomecenterResult
  historialIntentos: Array<DispatchNoticeAttempt>
}

export type IntegrationLogRecord = IntegrationLogDetail

interface MockDb {
  purchaseOrders: Array<PurchaseOrderRecord>
  dispatchNotices: Array<DispatchNoticeRecord>
  logs: Array<IntegrationLogRecord>
  seq: {
    logByDay: Record<string, number>
    noticeByOrder: Record<string, number>
    sync: number
  }
}

// --- Utilities ---

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isoDateTime(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Orders transmitted before this cutoff are seeded as `archivada` — kept
 *  out of the default listing unless `incluirHistorial` is set. */
function isOlderThanThreeMonths(d: Date): boolean {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 3)
  return d < cutoff
}

/** Reformats one of our own ISO datetimes back into Homecenter's
 *  "dd/mm/yyyy HH:mm:ss" shape, for the mock's Homecenter-echo payload only
 *  (`hc_integracion_log` stores the exact raw exchange, unprocessed — this
 *  is not date-transformation logic the frontend performs; the platform's
 *  own API never returns anything but ISO, per
 *  docs/especificacion-endpoints-backend (2).md, "Convenciones generales"). */
function toHomecenterFecha24h(iso: IsoDateTime): string {
  const [date, time] = iso.replace('Z', '').split('T')
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year} ${time}`
}

export function paginate<T>(rows: Array<T>, page = 1, pageSize = 20) {
  const safeSize = Math.min(Math.max(pageSize, 1), 100)
  const safePage = Math.max(page, 1)
  const total = rows.length
  const totalPages = Math.max(Math.ceil(total / safeSize), 1)
  const start = (safePage - 1) * safeSize
  return {
    data: rows.slice(start, start + safeSize),
    pagination: { page: safePage, pageSize: safeSize, total, totalPages },
  }
}

export function nextLogId(db: MockDb, when: Date): string {
  const day = isoDate(when).replace(/-/g, '')
  const n = (db.seq.logByDay[day] ?? 0) + 1
  db.seq.logByDay[day] = n
  const time = isoDateTime(when).slice(11, 19).replace(/:/g, '')
  return `log-${day}-${time}${String(n).padStart(2, '0')}`
}

export function nextDispatchNoticeId(db: MockDb, ordenCompra: string): string {
  const n = (db.seq.noticeByOrder[ordenCompra] ?? 0) + 1
  db.seq.noticeByOrder[ordenCompra] = n
  return `av-${ordenCompra}-${String(n).padStart(3, '0')}`
}

export function nextSyncId(db: MockDb): string {
  db.seq.sync += 1
  const day = isoDate(new Date()).replace(/-/g, '')
  return `sync-${day}-${String(db.seq.sync).padStart(4, '0')}`
}

/** Deterministic-ish EAN128 (SSCC-shaped, 18 digits). */
export function generateEan128(container: string, eanSku: string): string {
  const base = `${container}${eanSku}`
  let hash = 0
  for (const ch of base) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `37${String(hash).padStart(16, '0').slice(0, 16)}`
}

// --- Seed ---

const ORDER_STATUSES: Array<OrderStatus> = [
  'PENDIENTE',
  'PENDIENTE',
  'PROCESANDO',
  'DESPACHADA',
  'DESPACHADA',
  'CON_ERROR',
]

function pickStores(count: number) {
  return faker.helpers.arrayElements(STORES, count)
}

/** Splits `total` across `stores.length` entries so they sum back to `total`
 *  exactly — a mock-data design choice, not a confirmed Homecenter invariant
 *  (see specs/00-purchase-order-response-update.md § Decisions). */
function splitQuantityAcrossStores(
  total: number,
  stores: Array<StoreCatalogEntry>,
): Array<PurchaseOrderRecordStore> {
  if (stores.length === 1) {
    return [
      {
        eanTienda: stores[0].eanTienda,
        nombreTienda: stores[0].nombre,
        cantidad: total,
      },
    ]
  }
  const cuts = new Set<number>()
  while (cuts.size < stores.length - 1) {
    cuts.add(faker.number.int({ min: 1, max: total - 1 }))
  }
  const boundaries = [0, ...Array.from(cuts).sort((a, b) => a - b), total]
  return stores.map((store, i) => ({
    eanTienda: store.eanTienda,
    nombreTienda: store.nombre,
    cantidad: boundaries[i + 1] - boundaries[i],
  }))
}

function buildPurchaseOrderLines(
  status: OrderStatus,
): Array<PurchaseOrderLineItem> {
  const products = faker.helpers.arrayElements(
    PRODUCTS,
    faker.number.int({ min: 1, max: 4 }),
  )
  return products.map((product) => {
    const cantidadSolicitada = faker.number.int({ min: 10, max: 400 })
    const cancelledQty =
      status === 'CON_ERROR' && faker.datatype.boolean(0.4)
        ? faker.number.int({
            min: 1,
            max: Math.floor(cantidadSolicitada / 4),
          })
        : 0
    let estadoLinea: OrderLineStatus = 'PENDIENTE'
    if (status === 'DESPACHADA') estadoLinea = 'DESPACHADA'
    else if (status === 'PROCESANDO') estadoLinea = 'PARCIAL'
    else if (status === 'CON_ERROR') {
      estadoLinea = faker.datatype.boolean(0.5)
        ? 'SUPERA_SOLICITADO'
        : 'CANCELADA'
    }

    const stores = pickStores(faker.number.int({ min: 1, max: 3 }))

    return {
      eanSku: product.eanSku,
      skuHomecenter: product.skuHomecenter,
      descripcion: product.descripcion,
      cantidadSolicitada,
      cantidadCancelada: cancelledQty,
      cantidadDevuelta: 0,
      estadoLinea,
      costoUnitario: product.costoUnitario,
      condicionPago: faker.helpers.arrayElement(PAYMENT_CONDITIONS),
      descuentoSku: faker.number.float({ min: 0, max: 30, fractionDigits: 2 }),
      unidadVenta: faker.helpers.arrayElement(SALE_UNITS),
      tiendas: splitQuantityAcrossStores(cantidadSolicitada, stores),
    }
  })
}

/** Regroups the (products-first) line items by store — dispatch notices need
 *  a per-store view, so this transposes the platform's own wire shape back
 *  for that one consumer instead of storing the data twice. */
function groupOrderLinesByTienda(
  productos: Array<PurchaseOrderLineItem>,
): Array<{
  eanTienda: string
  items: Array<{ eanSku: string; cantidad: number }>
}> {
  const byTienda = new Map<
    string,
    Array<{ eanSku: string; cantidad: number }>
  >()
  for (const producto of productos) {
    for (const tienda of producto.tiendas) {
      const items = byTienda.get(tienda.eanTienda) ?? []
      items.push({ eanSku: producto.eanSku, cantidad: tienda.cantidad })
      byTienda.set(tienda.eanTienda, items)
    }
  }
  return Array.from(byTienda, ([eanTienda, items]) => ({ eanTienda, items }))
}

/** Real Homecenter Cross-Docking order sample (`docs/ORD_15669499 (1).csv`) —
 *  unlike the rest of this seed, this record isn't `faker`-generated. The
 *  order number, delivery dates, `eanSku`/`skuHomecenter` pairs, per-store
 *  quantities, and unit prices below are transcribed verbatim from that
 *  export (32 SKUs across 35 stores). `descripcion` is empty for every line
 *  except one because the raw export itself leaves it blank; the "Codigo
 *  Item Proveedor" column (our own product code, e.g. `T200500009`) has no
 *  home in `PurchaseOrderLineItem` yet, so it only survives as an inline
 *  comment. `condicionPago`, `unidadVenta`, and `descuentoSku` aren't in the
 *  export either — filled in the same made-up way every other seeded order
 *  does it. See CLAUDE.md's "Open items / unconfirmed with Homecenter". */
function buildRealSampleOrder(): PurchaseOrderRecord {
  const productosOrden15669499: Array<PurchaseOrderLineItem> = [
    {
      eanSku: '7705666884140',
      skuHomecenter: '565032',
      descripcion: '', // Codigo Item Proveedor T200500009
      cantidadSolicitada: 88,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 12500,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900801',
          nombreTienda: 'SODIMAC - BOGOTA SUR',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900405',
          nombreTienda: 'SODIMAC - MEDELLIN INDUSTRIALES',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900306',
          nombreTienda: 'SODIMAC - CALI SUR',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900191',
          nombreTienda: 'SODIMAC - IBAGUE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900429',
          nombreTienda: 'SODIMAC - BELLO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900153',
          nombreTienda: 'SODIMAC - BOGOTA CALIMA NQS',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900566',
          nombreTienda: 'SODIMAC - MONTERIA EL RECREO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900658',
          nombreTienda: 'SODIMAC - MANIZALES SAN RAFAEL',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900115',
          nombreTienda: 'SODIMAC - BOGOTA CEDRITOS',
          cantidad: 8,
        },
        {
          eanTienda: '7703670901235',
          nombreTienda: 'SODIMAC - TINTAL',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900450',
          nombreTienda: 'SODIMAC - RIONEGRO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900443',
          nombreTienda: 'SODIMAC - ENVIGADO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900214',
          nombreTienda: 'SODIMAC - YOPAL',
          cantidad: 4,
        },
        {
          eanTienda: '7703670901228',
          nombreTienda: 'SODIMAC - TUNJA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666561195',
      skuHomecenter: '3057531',
      descripcion: '', // Codigo Item Proveedor T2010BOL42
      cantidadSolicitada: 10,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 330500,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 3,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 3,
        },
        {
          eanTienda: '7703670900436',
          nombreTienda: 'SODIMAC - MEDELLIN MOLINOS',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 1,
        },
      ],
    },
    {
      eanSku: '7705666906996',
      skuHomecenter: '565029',
      descripcion: '', // Codigo Item Proveedor T200500010
      cantidadSolicitada: 64,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 29900,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900184',
          nombreTienda: 'SODIMAC - VILLAVICENCIO',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900658',
          nombreTienda: 'SODIMAC - MANIZALES SAN RAFAEL',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900115',
          nombreTienda: 'SODIMAC - BOGOTA CEDRITOS',
          cantidad: 4,
        },
        {
          eanTienda: '7703670901235',
          nombreTienda: 'SODIMAC - TINTAL',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900450',
          nombreTienda: 'SODIMAC - RIONEGRO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900207',
          nombreTienda: 'SODIMAC - GIRARDOT',
          cantidad: 8,
        },
        {
          eanTienda: '7703670901167',
          nombreTienda: 'SODIMAC - MOSQUERA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666261484',
      skuHomecenter: '583900',
      descripcion: '', // Codigo Item Proveedor T2005INN14
      cantidadSolicitada: 8,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 68800,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666059050',
      skuHomecenter: '3057529',
      descripcion: '', // Codigo Item Proveedor T2010BOL40
      cantidadSolicitada: 13,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 60300,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900658',
          nombreTienda: 'SODIMAC - MANIZALES SAN RAFAEL',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666939819',
      skuHomecenter: '565027',
      descripcion: '', // Codigo Item Proveedor T200500006
      cantidadSolicitada: 104,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 12500,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900504',
          nombreTienda: 'SODIMAC - BARRANQUILLA NORTE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900313',
          nombreTienda: 'SODIMAC - CALI NORTE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900108',
          nombreTienda: 'SODIMAC - SUBA',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900542',
          nombreTienda: 'SODIMAC - CARTAGENA LA POPA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900429',
          nombreTienda: 'SODIMAC - BELLO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900900',
          nombreTienda: 'SODIMAC - CUCUTA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900436',
          nombreTienda: 'SODIMAC - MEDELLIN MOLINOS',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900184',
          nombreTienda: 'SODIMAC - VILLAVICENCIO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900153',
          nombreTienda: 'SODIMAC - BOGOTA CALIMA NQS',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900566',
          nombreTienda: 'SODIMAC - MONTERIA EL RECREO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900658',
          nombreTienda: 'SODIMAC - MANIZALES SAN RAFAEL',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900115',
          nombreTienda: 'SODIMAC - BOGOTA CEDRITOS',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900443',
          nombreTienda: 'SODIMAC - ENVIGADO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900559',
          nombreTienda: 'SODIMAC - VALLEDUPAR GUATAPURI',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900207',
          nombreTienda: 'SODIMAC - GIRARDOT',
          cantidad: 4,
        },
        {
          eanTienda: '7703670901228',
          nombreTienda: 'SODIMAC - TUNJA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670901167',
          nombreTienda: 'SODIMAC - MOSQUERA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666112779',
      skuHomecenter: '675855',
      descripcion: '', // Codigo Item Proveedor T2005MFG01
      cantidadSolicitada: 24,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 22500,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900191',
          nombreTienda: 'SODIMAC - IBAGUE',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 6,
        },
      ],
    },
    {
      eanSku: '7705666250495',
      skuHomecenter: '3057525',
      descripcion: '', // Codigo Item Proveedor T2010SNA06
      cantidadSolicitada: 16,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 378000,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900801',
          nombreTienda: 'SODIMAC - BOGOTA SUR',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900306',
          nombreTienda: 'SODIMAC - CALI SUR',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900504',
          nombreTienda: 'SODIMAC - BARRANQUILLA NORTE',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900115',
          nombreTienda: 'SODIMAC - BOGOTA CEDRITOS',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900443',
          nombreTienda: 'SODIMAC - ENVIGADO',
          cantidad: 3,
        },
      ],
    },
    {
      eanSku: '7705666193457',
      skuHomecenter: '3072494',
      descripcion: '', // Codigo Item Proveedor T150501843
      cantidadSolicitada: 38,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 28200,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900801',
          nombreTienda: 'SODIMAC - BOGOTA SUR',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900108',
          nombreTienda: 'SODIMAC - SUBA',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900191',
          nombreTienda: 'SODIMAC - IBAGUE',
          cantidad: 9,
        },
        {
          eanTienda: '7703670900184',
          nombreTienda: 'SODIMAC - VILLAVICENCIO',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900153',
          nombreTienda: 'SODIMAC - BOGOTA CALIMA NQS',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900566',
          nombreTienda: 'SODIMAC - MONTERIA EL RECREO',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900177',
          nombreTienda: 'SODIMAC - NEIVA',
          cantidad: 1,
        },
        {
          eanTienda: '7703670901235',
          nombreTienda: 'SODIMAC - TINTAL',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900450',
          nombreTienda: 'SODIMAC - RIONEGRO',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900559',
          nombreTienda: 'SODIMAC - VALLEDUPAR GUATAPURI',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900528',
          nombreTienda: 'SODIMAC - BARRANQUILLA CENTRO',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900214',
          nombreTienda: 'SODIMAC - YOPAL',
          cantidad: 1,
        },
        {
          eanTienda: '7703670901167',
          nombreTienda: 'SODIMAC - MOSQUERA',
          cantidad: 1,
        },
      ],
    },
    {
      eanSku: '7707203668268',
      skuHomecenter: '140948',
      descripcion: 'JB 3 PIEZAS POLIPROPILENO', // Codigo Item Proveedor 315
      cantidadSolicitada: 42,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 34600,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900139',
          nombreTienda: 'SODIMAC – SOACHA',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900429',
          nombreTienda: 'SODIMAC - BELLO',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900900',
          nombreTienda: 'SODIMAC - CUCUTA',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900184',
          nombreTienda: 'SODIMAC - VILLAVICENCIO',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 6,
        },
      ],
    },
    {
      eanSku: '7703670917724',
      skuHomecenter: '234348',
      descripcion: '', // Codigo Item Proveedor T150500900
      cantidadSolicitada: 24,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 24900,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900580',
          nombreTienda: 'SODIMAC - AV EL DORADO',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 6,
        },
      ],
    },
    {
      eanSku: '7705666511138',
      skuHomecenter: '565031',
      descripcion: '', // Codigo Item Proveedor T200500008
      cantidadSolicitada: 44,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 40900,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900306',
          nombreTienda: 'SODIMAC - CALI SUR',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900108',
          nombreTienda: 'SODIMAC - SUBA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900191',
          nombreTienda: 'SODIMAC - IBAGUE',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900436',
          nombreTienda: 'SODIMAC - MEDELLIN MOLINOS',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900184',
          nombreTienda: 'SODIMAC - VILLAVICENCIO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900177',
          nombreTienda: 'SODIMAC - NEIVA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900115',
          nombreTienda: 'SODIMAC - BOGOTA CEDRITOS',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900528',
          nombreTienda: 'SODIMAC - BARRANQUILLA CENTRO',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666111505',
      skuHomecenter: '3072496',
      descripcion: '', // Codigo Item Proveedor T2005CFY02
      cantidadSolicitada: 11,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 84900,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 6,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666653791',
      skuHomecenter: '769187',
      descripcion: '', // Codigo Item Proveedor T2005MAZ01
      cantidadSolicitada: 8,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 19600,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900900',
          nombreTienda: 'SODIMAC - CUCUTA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666555866',
      skuHomecenter: '3072495',
      descripcion: '', // Codigo Item Proveedor T150501844
      cantidadSolicitada: 37,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 28200,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900801',
          nombreTienda: 'SODIMAC - BOGOTA SUR',
          cantidad: 11,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900108',
          nombreTienda: 'SODIMAC - SUBA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900191',
          nombreTienda: 'SODIMAC - IBAGUE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900429',
          nombreTienda: 'SODIMAC - BELLO',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900184',
          nombreTienda: 'SODIMAC - VILLAVICENCIO',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900955',
          nombreTienda: 'SODIMAC - BUCARAMANGA LA ROSITA',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900153',
          nombreTienda: 'SODIMAC - BOGOTA CALIMA NQS',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900566',
          nombreTienda: 'SODIMAC - MONTERIA EL RECREO',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900115',
          nombreTienda: 'SODIMAC - BOGOTA CEDRITOS',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900528',
          nombreTienda: 'SODIMAC - BARRANQUILLA CENTRO',
          cantidad: 1,
        },
        {
          eanTienda: '7703670901167',
          nombreTienda: 'SODIMAC - MOSQUERA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666905982',
      skuHomecenter: '565030',
      descripcion: '', // Codigo Item Proveedor T200500011
      cantidadSolicitada: 40,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 40900,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900405',
          nombreTienda: 'SODIMAC - MEDELLIN INDUSTRIALES',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900313',
          nombreTienda: 'SODIMAC - CALI NORTE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900108',
          nombreTienda: 'SODIMAC - SUBA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900184',
          nombreTienda: 'SODIMAC - VILLAVICENCIO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900115',
          nombreTienda: 'SODIMAC - BOGOTA CEDRITOS',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900207',
          nombreTienda: 'SODIMAC - GIRARDOT',
          cantidad: 8,
        },
        {
          eanTienda: '7703670901167',
          nombreTienda: 'SODIMAC - MOSQUERA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666423561',
      skuHomecenter: '3057522',
      descripcion: '', // Codigo Item Proveedor T2010SNA03
      cantidadSolicitada: 14,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 378000,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900801',
          nombreTienda: 'SODIMAC - BOGOTA SUR',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900306',
          nombreTienda: 'SODIMAC - CALI SUR',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900108',
          nombreTienda: 'SODIMAC - SUBA',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900436',
          nombreTienda: 'SODIMAC - MEDELLIN MOLINOS',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900153',
          nombreTienda: 'SODIMAC - BOGOTA CALIMA NQS',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900443',
          nombreTienda: 'SODIMAC - ENVIGADO',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666151952',
      skuHomecenter: '565028',
      descripcion: '', // Codigo Item Proveedor T200500007
      cantidadSolicitada: 48,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 29900,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900689',
          nombreTienda: 'SODIMAC - BOGOTA CALLE 80',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900108',
          nombreTienda: 'SODIMAC - SUBA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900191',
          nombreTienda: 'SODIMAC - IBAGUE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900658',
          nombreTienda: 'SODIMAC - MANIZALES SAN RAFAEL',
          cantidad: 8,
        },
        {
          eanTienda: '7703670900450',
          nombreTienda: 'SODIMAC - RIONEGRO',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900559',
          nombreTienda: 'SODIMAC - VALLEDUPAR GUATAPURI',
          cantidad: 4,
        },
        {
          eanTienda: '7703670901167',
          nombreTienda: 'SODIMAC - MOSQUERA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666141090',
      skuHomecenter: '675854',
      descripcion: '', // Codigo Item Proveedor T2005MGV01
      cantidadSolicitada: 6,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 22500,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900702',
          nombreTienda: 'SODIMAC - BOGOTA NORTE',
          cantidad: 6,
        },
      ],
    },
    {
      eanSku: '7705666961032',
      skuHomecenter: '583583',
      descripcion: '', // Codigo Item Proveedor T100510003
      cantidadSolicitada: 4,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 84000,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900306',
          nombreTienda: 'SODIMAC - CALI SUR',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666649053',
      skuHomecenter: '630516',
      descripcion: '', // Codigo Item Proveedor T302000006
      cantidadSolicitada: 8,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 105900,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900313',
          nombreTienda: 'SODIMAC - CALI NORTE',
          cantidad: 8,
        },
      ],
    },
    {
      eanSku: '7705666056523',
      skuHomecenter: '630515',
      descripcion: '', // Codigo Item Proveedor T302000003
      cantidadSolicitada: 20,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 89000,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900658',
          nombreTienda: 'SODIMAC - MANIZALES SAN RAFAEL',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900665',
          nombreTienda: 'SODIMAC - ARMENIA',
          cantidad: 4,
        },
        {
          eanTienda: '7703670901167',
          nombreTienda: 'SODIMAC - MOSQUERA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666370346',
      skuHomecenter: '3057534',
      descripcion: '', // Codigo Item Proveedor T2010BOL45
      cantidadSolicitada: 4,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 330500,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 2,
        },
        {
          eanTienda: '7703670900658',
          nombreTienda: 'SODIMAC - MANIZALES SAN RAFAEL',
          cantidad: 1,
        },
        {
          eanTienda: '7703670900115',
          nombreTienda: 'SODIMAC - BOGOTA CEDRITOS',
          cantidad: 1,
        },
      ],
    },
    {
      eanSku: '7705666225066',
      skuHomecenter: '3057530',
      descripcion: '', // Codigo Item Proveedor T2010BOL41
      cantidadSolicitada: 3,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 183800,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 3,
        },
      ],
    },
    {
      eanSku: '7705666958544',
      skuHomecenter: '3057532',
      descripcion: '', // Codigo Item Proveedor T2010BOL43
      cantidadSolicitada: 4,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 60300,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900603',
          nombreTienda: 'SODIMAC - PEREIRA',
          cantidad: 3,
        },
        {
          eanTienda: '7703670900139',
          nombreTienda: 'SODIMAC – SOACHA',
          cantidad: 1,
        },
      ],
    },
    {
      eanSku: '7705666614815',
      skuHomecenter: '769185',
      descripcion: '', // Codigo Item Proveedor T2005MSA02
      cantidadSolicitada: 4,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 19600,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666592779',
      skuHomecenter: '3057528',
      descripcion: '', // Codigo Item Proveedor T2010BOL39
      cantidadSolicitada: 1,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 330500,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 1,
        },
      ],
    },
    {
      eanSku: '7705666787465',
      skuHomecenter: '583584',
      descripcion: '', // Codigo Item Proveedor T100500009
      cantidadSolicitada: 12,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 81000,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900191',
          nombreTienda: 'SODIMAC - IBAGUE',
          cantidad: 4,
        },
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 4,
        },
      ],
    },
    {
      eanSku: '7705666288603',
      skuHomecenter: '3057533',
      descripcion: '', // Codigo Item Proveedor T2010BOL44
      cantidadSolicitada: 9,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 183800,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900412',
          nombreTienda: 'SODIMAC - MEDELLIN SAN JUAN',
          cantidad: 9,
        },
      ],
    },
    {
      eanSku: '7705666987810',
      skuHomecenter: '3057521',
      descripcion: '', // Codigo Item Proveedor T2010SNA02
      cantidadSolicitada: 1,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 210000,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900436',
          nombreTienda: 'SODIMAC - MEDELLIN MOLINOS',
          cantidad: 1,
        },
      ],
    },
    {
      eanSku: '7705666564301',
      skuHomecenter: '769184',
      descripcion: '', // Codigo Item Proveedor T2005MIN01
      cantidadSolicitada: 80,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 12000,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900177',
          nombreTienda: 'SODIMAC - NEIVA',
          cantidad: 80,
        },
      ],
    },
    {
      eanSku: '7705666518748',
      skuHomecenter: '588886',
      descripcion: '', // Codigo Item Proveedor T2005INN15
      cantidadSolicitada: 4,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 44300,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900122',
          nombreTienda: 'SODIMAC - CAJICA',
          cantidad: 4,
        },
      ],
    },
  ]

  const cedi = DELIVERY_POINTS[0] // EAN 7703670529804 — matches the CSV's "EAN/Nombre Lugar Entrega Factura".
  const fechaTransmision = '2026-06-01' // raw "F. Documento O/C": 01/06/2026 12:00
  const costoTotalOc = productosOrden15669499.reduce(
    (sum, p) => sum + p.costoUnitario * p.cantidadSolicitada,
    0,
  )

  return {
    ordenCompra: '15669499',
    eanPuntoEntrega: cedi.ean,
    cliente: 'Sodimac Colombia S.A.- Home Center', // raw "Nombre Entidad a Facturar"
    ciudadEntrega: cedi.ciudad,
    direccionEntrega: cedi.direccion,
    barrioEntrega: cedi.ciudad,
    departamentoEntrega: 'Cundinamarca',
    codigoDaneEntrega: '25286', // DANE code for Funza, Cundinamarca — not in the CSV, filled in for realism.
    facturacion: {
      barrio: cedi.ciudad,
      ciudad: cedi.ciudad,
      departamento: 'Cundinamarca',
      direccion: cedi.direccion,
    },
    estado: 'PENDIENTE',
    codigoSesionRecibo: null,
    fechaTransmision,
    ultimaActualizacion: `${fechaTransmision}T12:00:00Z`,
    productos: productosOrden15669499,
    costoTotalOc,
    transportadora: '3-TRANSPORTES SODIMAC',
    fechaMinEntrega: '2026-06-12T00:00:00Z', // raw "F. Minima Entrega"
    fechaMaxEntrega: '2026-06-16T00:00:00Z', // raw "F. Maxima Entrega"
    fechaCancelacion: null,
    sticker: null,
    tipoOc: '4-Venta Empresa',
    tipoDocumento: '1',
    notaPedido: '42-100234',
    cedulaComprador: '1000000000',
    emailCliente: 'compras.pruebas@example.com',
    telefonoCliente: '+57 3000000000',
    clienteRecibe: 'Bodega CEDI Funza',
    eanTiendaVenta: cedi.ean,
    eanTiendaFacturacion: cedi.ean,
    localidad: cedi.ean,
    eanEmpresaCompradora: '7703670900009', // raw "EAN Entidad a Facturar"
    tipoDeOrden: 'CROSS_DOCKING',
    tipoEntrega: 'RETAIL',
    observaciones: cedi.ciudad,
    observacionesNpc: `Favor entregar en ${cedi.direccion}.`,
    observacionesNpl: 'CDFZ15669499',
    archivada: isOlderThanThreeMonths(new Date(fechaTransmision)),
    numPedido: null,
    intentos: 0,
    maxIntentos: 3,
  }
}

function makePurchaseOrder(
  ordenCompra: string,
  status: OrderStatus,
): PurchaseOrderRecord {
  const deliveryPoint = faker.helpers.arrayElement(DELIVERY_POINTS)
  // Spans past the 3-month archive cutoff below so the seed actually
  // includes some orders old enough to be `archivada`.
  const orderDate = faker.date.recent({ days: 180 })
  const updatedAt = faker.date.between({ from: orderDate, to: new Date() })
  const minEntrega = faker.date.soon({ days: 10, refDate: orderDate })
  const maxEntrega = faker.date.soon({ days: 5, refDate: minEntrega })
  const productos = buildPurchaseOrderLines(status)
  const costoTotalOc = productos.reduce(
    (sum, p) => sum + p.costoUnitario * p.cantidadSolicitada,
    0,
  )
  const departamento = faker.location.state()

  return {
    ordenCompra,
    eanPuntoEntrega: deliveryPoint.ean,
    cliente: faker.helpers.arrayElement(CLIENTS),
    ciudadEntrega: deliveryPoint.ciudad,
    direccionEntrega: deliveryPoint.direccion,
    barrioEntrega: deliveryPoint.ciudad,
    departamentoEntrega: departamento,
    codigoDaneEntrega: faker.string.numeric(5),
    facturacion: {
      barrio: deliveryPoint.ciudad,
      ciudad: deliveryPoint.ciudad,
      departamento,
      direccion: deliveryPoint.direccion,
    },
    estado: status,
    codigoSesionRecibo:
      status === 'DESPACHADA' && faker.datatype.boolean(0.5)
        ? `REC-${isoDate(updatedAt).replace(/-/g, '')}-${faker.number.int({ min: 1, max: 9 })}`
        : null,
    fechaTransmision: isoDate(orderDate),
    ultimaActualizacion: isoDateTime(updatedAt),
    productos,
    costoTotalOc,
    transportadora: faker.helpers.arrayElement(CARRIERS),
    fechaMinEntrega: isoDateTime(minEntrega),
    fechaMaxEntrega: isoDateTime(maxEntrega),
    fechaCancelacion: faker.datatype.boolean(0.05)
      ? isoDateTime(faker.date.recent({ days: 5, refDate: updatedAt }))
      : null,
    sticker: faker.datatype.boolean(0.85) ? faker.string.numeric(12) : null,
    tipoOc: faker.helpers.arrayElement(ORDER_TYPES),
    tipoDocumento: faker.datatype.boolean(0.9) ? '1' : null,
    notaPedido: `${faker.number.int({ min: 10, max: 99 })}-${faker.number.int({ min: 100_000, max: 999_999 })}`,
    cedulaComprador: faker.string.numeric(10),
    emailCliente: faker.internet.email().toLowerCase(),
    telefonoCliente: faker.phone.number(),
    clienteRecibe: faker.person.fullName(),
    eanTiendaVenta: deliveryPoint.ean,
    eanTiendaFacturacion: deliveryPoint.ean,
    localidad: deliveryPoint.ean,
    eanEmpresaCompradora: '7703670900009',
    tipoDeOrden: faker.helpers.arrayElement(ORDER_FULFILLMENT_TYPES),
    tipoEntrega: faker.helpers.arrayElement(DELIVERY_CHANNELS),
    observaciones: deliveryPoint.ciudad,
    observacionesNpc: `Favor entregar en ${deliveryPoint.direccion}.`,
    observacionesNpl: faker.string.alphanumeric(10).toUpperCase(),
    archivada: isOlderThanThreeMonths(orderDate),
    numPedido: faker.datatype.boolean(0.8)
      ? `${faker.number.int({ min: 10, max: 99 })}-${faker.number.int({ min: 100_000, max: 999_999 })}`
      : null,
    intentos: status === 'CON_ERROR' ? faker.number.int({ min: 1, max: 2 }) : 0,
    maxIntentos: 3,
  }
}

/** Mimics the Spanish payload Homecenter would echo back for a PO sync. */
function purchaseOrderToHomecenterRequest(order: PurchaseOrderRecord) {
  return {
    metodo: 'GetOrdenesDeCompra',
    filtros: { ordenCompra: order.ordenCompra, modo: 'INCREMENTAL' },
  }
}

/** Homecenter's raw `ESTADO_SKU` carries a numeric prefix (see
 *  specs/01-purchase-order-status-handling.md) — only `1-PENDIENTE` is
 *  confirmed, the rest are unconfirmed placeholders. Local to this mock
 *  echo builder only: the frontend never resolves this prefix itself (see
 *  docs/especificacion-endpoints-backend (2).md, "Convenciones generales"). */
const MOCK_ESTADO_SKU_CODE: Record<OrderLineStatus, string> = {
  PENDIENTE: '1-PENDIENTE',
  DESPACHADA: '2-DESPACHADA',
  PARCIAL: '3-PARCIAL',
  CANCELADA: '4-CANCELADA',
  SUPERA_SOLICITADO: '5-SUPERA_SOLICITADO',
}

/** Mirrors a real `GetOrdenesDeCompra` response (see
 *  specs/00-purchase-order-response-update.md) — envelope, field names, and
 *  the PRODUCTOS[].TIENDAS[] nesting all match what Homecenter actually
 *  sends, not an invented shape. */
function purchaseOrderToHomecenterResponse(order: PurchaseOrderRecord) {
  return {
    Estado: true,
    Mensaje: 'Sentencia ejecutada con éxito.',
    Value: [
      {
        ORDEN_COMPRA: Number(order.ordenCompra),
        CANTIDAD_TOT_OC: order.productos.reduce(
          (sum, p) => sum + p.cantidadSolicitada,
          0,
        ),
        COSTO_TOT_OC: order.costoTotalOc,
        FECHA_CANCELACION: order.fechaCancelacion
          ? toHomecenterFecha24h(order.fechaCancelacion)
          : '',
        STICKER: order.sticker ?? '-1',
        ESTADO_OC: order.estado,
        TRANSPORTADORA: order.transportadora,
        FECHA_MIN_ENTREGA: order.fechaMinEntrega
          ? toHomecenterFecha24h(order.fechaMinEntrega)
          : '',
        FECHA_MAX_ENTREGA: order.fechaMaxEntrega
          ? toHomecenterFecha24h(order.fechaMaxEntrega)
          : '',
        TIPO_OC: order.tipoOc,
        CODIGO_SESION_RECIBO: order.codigoSesionRecibo ?? -1,
        FECHA_TRANSMISION: order.fechaTransmision
          .split('-')
          .reverse()
          .join('/'),
        NOTA_PEDIDO: order.notaPedido,
        CLIENTE: order.cliente,
        CEDULA: order.cedulaComprador,
        EMAIL_CLIENTE: order.emailCliente,
        TELEFONO_CLIENTE: order.telefonoCliente,
        BARRIO_ENTREGA: order.barrioEntrega,
        CIUDAD_ENTREGA: order.ciudadEntrega,
        DEPARTAMENTO_ENTREGA: order.departamentoEntrega,
        DIRECCION_ENTREGA: order.direccionEntrega,
        BARRIO_FAC: order.facturacion.barrio,
        CIUDAD_FAC: order.facturacion.ciudad,
        DEPARTAMENTO_FAC: order.facturacion.departamento,
        DIRECCION_FAC: order.facturacion.direccion,
        TIENDA_VENTA: order.eanTiendaVenta,
        TIENDA_FACTURACION: order.eanTiendaFacturacion,
        PUNTO_ENTREGA: order.eanPuntoEntrega,
        TIPO_DOCUMENTO: order.tipoDocumento ? Number(order.tipoDocumento) : -1,
        LOCALIDAD: order.localidad,
        FECHA_PAGO: '', // SPEC 02's territory — not modeled on this record yet.
        EAN_EMPRESA_COMPRADORA: order.eanEmpresaCompradora,
        TIPO_DE_ORDEN: order.tipoDeOrden,
        TIPO_ENTREGA: order.tipoEntrega,
        CODIGO_DANE_CE: order.codigoDaneEntrega,
        OBSERVACIONES: order.observaciones,
        OBSERVACIONES_NPC: order.observacionesNpc,
        OBSERVACIONES_NPL: order.observacionesNpl,
        CLIENTE_RECIBE: order.clienteRecibe,
        PRODUCTOS: order.productos.map((p) => ({
          SKU: p.skuHomecenter,
          PRODUCTO: p.descripcion,
          EAN_PRODUCTO: Number(p.eanSku),
          CANTIDAD_SKU: p.cantidadSolicitada,
          CANTIDAD_CANCELADA: p.cantidadCancelada,
          COSTO_SKU: p.costoUnitario,
          CANTIDAD_DEVUELTA_SKU: p.cantidadDevuelta,
          ESTADO_SKU: MOCK_ESTADO_SKU_CODE[p.estadoLinea],
          CONDICION_PAGO: p.condicionPago,
          DESCUENTO_SKU: p.descuentoSku,
          UNIDAD_VENTA: p.unidadVenta,
          TIENDAS: p.tiendas.map((t) => ({
            EAN_TIENDA: t.eanTienda,
            NOMBRE_TIENDA: t.nombreTienda,
            CANTIDAD: t.cantidad,
          })),
        })),
      },
    ],
  }
}

function dispatchNoticeToHomecenterRequest(notice: DispatchNoticeRecord) {
  return {
    OrdenCompra: notice.ordenCompra,
    FechaRealDespacho: notice.fechaRealDespacho.split('-').reverse().join('/'),
    Tiendas: notice.tiendas.map((t) => ({
      EanTienda: t.eanTienda,
      Contenedores: t.contenedores.map((c) => ({
        Contenedor: c.contenedor,
        Productos: c.productos.map((p) => ({
          EanSku: p.eanSku,
          Cantidad: p.cantidad,
          Peso: p.peso,
          Volumen: p.volumen,
        })),
      })),
    })),
  }
}

function seed(): MockDb {
  faker.seed(8467343)
  const db: MockDb = {
    purchaseOrders: [],
    dispatchNotices: [],
    logs: [],
    seq: { logByDay: {}, noticeByOrder: {}, sync: 90 },
  }

  // Canonical order from the spec so its documented examples resolve.
  const canonical = makePurchaseOrder('8467343', 'PENDIENTE')
  canonical.cliente = 'Cali Sur'
  canonical.ciudadEntrega = 'Cali'
  canonical.eanPuntoEntrega = '7703670529804'
  canonical.direccionEntrega = 'Cra 12 N27-31, Tunja'
  canonical.productos = [
    {
      eanSku: '7703670004288',
      skuHomecenter: '412001',
      descripcion: 'MALLA ESLABONADA 1.8x10m METAL 2.1/4x2.1/4 2.5 mm',
      cantidadSolicitada: 30,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 89000,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900306',
          nombreTienda: 'SODIMAC - CALI SUR',
          cantidad: 30,
        },
      ],
    },
    {
      eanSku: '7703670004295',
      skuHomecenter: '412002',
      descripcion: 'PISO CERAMICA CALAMA BEIGE 51x51 CM CAJA x 1.30 M2',
      cantidadSolicitada: 30,
      cantidadCancelada: 0,
      cantidadDevuelta: 0,
      estadoLinea: 'PENDIENTE',
      costoUnitario: 42500,
      condicionPago: '30 Dias',
      descuentoSku: 0,
      unidadVenta: 'UND',
      tiendas: [
        {
          eanTienda: '7703670900306',
          nombreTienda: 'SODIMAC - CALI SUR',
          cantidad: 30,
        },
      ],
    },
  ]
  canonical.costoTotalOc = canonical.productos.reduce(
    (sum, p) => sum + p.costoUnitario * p.cantidadSolicitada,
    0,
  )
  db.purchaseOrders.push(canonical)

  // A second, real-world sample order — see buildRealSampleOrder() above.
  db.purchaseOrders.push(buildRealSampleOrder())

  // 44 more generated orders.
  for (let i = 0; i < 44; i += 1) {
    const ordenCompra = String(
      faker.number.int({ min: 12_000_000, max: 22_999_999 }),
    )
    const status = faker.helpers.arrayElement(ORDER_STATUSES)
    db.purchaseOrders.push(makePurchaseOrder(ordenCompra, status))
  }

  // One ORDEN_COMPRA_SYNC log per order (the last sync that brought it in).
  for (const order of db.purchaseOrders) {
    const when = new Date(order.ultimaActualizacion)
    const id = nextLogId(db, when)
    db.logs.push({
      integracionLogId: id,
      tipo: 'ORDEN_COMPRA_SYNC',
      fecha: isoDateTime(when),
      estado: order.estado === 'CON_ERROR' ? 'FALLIDO' : 'EXITOSO',
      referencia: order.ordenCompra,
      requestEnviado: purchaseOrderToHomecenterRequest(order),
      respuestaRecibida: purchaseOrderToHomecenterResponse(order),
    })
  }

  // Dispatch notices for a slice of the dispatched / processing orders.
  const candidates = db.purchaseOrders.filter(
    (o) => o.estado === 'DESPACHADA' || o.estado === 'PROCESANDO',
  )
  for (const order of faker.helpers.arrayElements(
    candidates,
    Math.min(candidates.length, 12),
  )) {
    const status = faker.helpers.arrayElement<DispatchNoticeStatus>([
      'BORRADOR',
      'ENVIADO',
      'ENVIADO',
      'CON_NOVEDAD',
      'ERROR_ENVIO',
    ])
    const dispatchedOn = faker.date.recent({ days: 20 })
    const storeGroups = groupOrderLinesByTienda(order.productos)
    const stores: Array<DispatchNoticeStoreInput> = storeGroups.map(
      (group, ti) => ({
        eanTienda: group.eanTienda,
        contenedores: [
          {
            contenedor: `CONT${String(ti + 1).padStart(3, '0')}`,
            productos: group.items.map((item) => ({
              eanSku: item.eanSku,
              cantidad: Math.max(
                1,
                Math.floor(
                  item.cantidad * faker.number.float({ min: 0.3, max: 1 }),
                ),
              ),
              peso: faker.number.float({ min: 5, max: 320, fractionDigits: 1 }),
              volumen: faker.number.float({
                min: 0.2,
                max: 4,
                fractionDigits: 2,
              }),
            })),
          },
        ],
      }),
    )

    const avisoId = nextDispatchNoticeId(db, order.ordenCompra)
    const notice: DispatchNoticeRecord = {
      avisoId,
      ordenCompra: order.ordenCompra,
      fechaRealDespacho: isoDate(dispatchedOn),
      enviarInmediatamente: status !== 'BORRADOR',
      tiendas: stores,
      estado: status,
      intentos: 0,
      integracionLogId: null,
      fechaEnvio: null,
      homecenter: { isError: false, errorMessage: null },
      historialIntentos: [],
    }

    if (status !== 'BORRADOR') {
      const when = dispatchedOn
      const logId = nextLogId(db, when)
      notice.intentos = 1
      notice.integracionLogId = logId
      notice.fechaEnvio = isoDateTime(when)

      if (status === 'CON_NOVEDAD') {
        const line = stores[0].contenedores[0].productos[0]
        notice.homecenter = {
          isError: false,
          errorMessage: 'Se presentaron errores en algunos items ver resultado',
          detalle: [
            {
              eanSku: line.eanSku,
              eanTienda: stores[0].eanTienda,
              mensaje: `El producto:'${line.eanSku}' dirigido a la tienda:'${stores[0].eanTienda}' supera la cantidad solicitada`,
            },
          ],
        }
      } else if (status === 'ERROR_ENVIO') {
        notice.homecenter = {
          isError: true,
          errorMessage: 'Homecenter no disponible (timeout tras 30s)',
        }
      }

      notice.historialIntentos.push({
        numero: 1,
        fecha: isoDateTime(when),
        estado: status,
        integracionLogId: logId,
      })

      db.logs.push({
        integracionLogId: logId,
        tipo: 'AVISO_DESPACHO',
        fecha: isoDateTime(when),
        estado:
          status === 'ENVIADO'
            ? 'EXITOSO'
            : status === 'CON_NOVEDAD'
              ? 'CON_NOVEDAD'
              : 'FALLIDO',
        referencia: avisoId,
        requestEnviado: dispatchNoticeToHomecenterRequest(notice),
        respuestaRecibida: notice.homecenter,
      })
    }

    db.dispatchNotices.push(notice)
  }

  // Sort logs newest-first for the integration-log screen.
  db.logs.sort((a, b) => b.fecha.localeCompare(a.fecha))
  return db
}

// --- Singleton ---

export const db: MockDb = seed()

export function resetDb(): void {
  const fresh = seed()
  db.purchaseOrders = fresh.purchaseOrders
  db.dispatchNotices = fresh.dispatchNotices
  db.logs = fresh.logs
  db.seq = fresh.seq
}

export { dispatchNoticeToHomecenterRequest }
