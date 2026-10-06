// In-memory store that backs the MSW handlers. Seeded once per process with a
// fixed faker seed so the "fake but real-looking" data is stable across reloads.
// Everything here is mutable: the create/resend/reprocess handlers write back.
//
// Purchase orders are sourced from `purchase-orders-seed.json` — a real
// Homecenter "Reporte Ordenes de Compra" export, pre-parsed by
// `scripts/generate-purchase-orders-seed.ts` (see that script's doc comment
// for why it's scoped to Cross-Docking orders only). `faker` only fills the
// gaps that export doesn't carry at all (per-line payment/unit terms) and
// drives the order-status variety (PROCESANDO/CON_ERROR/DESPACHADA split)
// the export's own 3-value ESTADO can't express — see `buildPurchaseOrder`
// below for exactly which fields are real vs. synthetic.
//
// Note: object *keys* and enum string *values* stay in Spanish because they
// mirror Homecenter's real contract (see docs/mock-api.md). Only identifiers
// (types, functions, variables) are in English.

import { faker } from '@faker-js/faker'
import { PAYMENT_CONDITIONS, SALE_UNITS } from './catalog'
import purchaseOrdersSeed from './purchase-orders-seed.json'
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

interface SeedStore {
  eanTienda: string
  nombreTienda: string
  cantidad: number
}

interface SeedProduct {
  eanSku: string
  skuHomecenter: string
  descripcion: string
  cantidadSolicitada: number
  costoUnitario: number
  tiendas: Array<SeedStore>
}

interface SeedOrder {
  ordenCompra: string
  estadoRaw: 'PENDIENTE' | 'FINAL' | 'CANCELADO'
  transportadora: string
  observacionesNpc: string | null
  fechaTransmision: string
  fechaCreacion: string
  fechaMinEntrega: string
  fechaMaxEntrega: string
  fechaEstadoFinal: string | null
  productos: Array<SeedProduct>
}

const SEED_ORDERS = purchaseOrdersSeed as Array<SeedOrder>

/** Every order in the seed is a Cross-Docking replenishment delivered to the
 *  same CEDI (see `scripts/generate-purchase-orders-seed.ts`'s doc comment)
 *  — these header fields are genuinely constant across all 67 real orders,
 *  not a mock shortcut. `direccion` is the export's own `DIRECCION_ALMACEN_ENTREGA`;
 *  `codigoDane` (Funza, Cundinamarca) isn't in the export and is filled in
 *  for realism, same as the hand-transcribed sample this replaces did. */
const CEDI_FUNZA = {
  ean: '7703670529804',
  direccion: 'KM 1.8 VÍA LA FUNZHE VARIANTE FUNZA',
  ciudad: 'Funza',
  departamento: 'Cundinamarca',
  codigoDane: '25286',
}

/** Real `NOMBRE_ENTIDAD_A_FACTURAR` / `EAN_ENTIDAD_A_FACTURAR` — also
 *  constant across every Cross-Docking order in the export. */
const BUYER_ENTITY = {
  ean: '7703670900009',
  nombre: 'SODIMAC COLOMBIA S.A.',
}

/** Distribution for the ~93% of orders the export only marks as
 *  "4-ESTADO FINAL" — that single value can't tell a cleanly dispatched
 *  order from one still in transit or one that errored out, so this mock
 *  splits them (seeded, so repeatable) in roughly the same proportions the
 *  old faker-only generator used (2 DESPACHADA : 1 PROCESANDO : 1 CON_ERROR)
 *  purely so the dispatch-notice and integration-log screens still have
 *  something of each status to render. Not derived from the export. */
const FINAL_STATUS_SPLIT: Array<OrderStatus> = [
  'DESPACHADA',
  'DESPACHADA',
  'PROCESANDO',
  'CON_ERROR',
]

/** Builds one line item from the seed's real product data, applying the
 *  order's resolved status the same way the previous faker-only generator
 *  did (cancelled/partial lines only show up on a CON_ERROR order). Payment
 *  terms, sale unit and discount aren't in the export at all — filled in
 *  the same made-up way every other seeded line already did it (see
 *  CLAUDE.md's "Open items / unconfirmed with Homecenter"). */
function buildLineItem(
  seedProduct: SeedProduct,
  estado: OrderStatus,
): PurchaseOrderLineItem {
  const cantidadCancelada =
    estado === 'CON_ERROR' && faker.datatype.boolean(0.4)
      ? faker.number.int({
          min: 1,
          max: Math.max(1, Math.floor(seedProduct.cantidadSolicitada / 4)),
        })
      : 0

  let estadoLinea: OrderLineStatus = 'PENDIENTE'
  if (estado === 'DESPACHADA') estadoLinea = 'DESPACHADA'
  else if (estado === 'PROCESANDO') estadoLinea = 'PARCIAL'
  else if (estado === 'CON_ERROR') {
    estadoLinea = faker.datatype.boolean(0.5)
      ? 'SUPERA_SOLICITADO'
      : 'CANCELADA'
  }

  return {
    eanSku: seedProduct.eanSku,
    skuHomecenter: seedProduct.skuHomecenter,
    descripcion: seedProduct.descripcion,
    cantidadSolicitada: seedProduct.cantidadSolicitada,
    cantidadCancelada,
    cantidadDevuelta: 0,
    estadoLinea,
    costoUnitario: seedProduct.costoUnitario,
    condicionPago: faker.helpers.arrayElement(PAYMENT_CONDITIONS),
    descuentoSku: faker.number.float({ min: 0, max: 30, fractionDigits: 2 }),
    unidadVenta: faker.helpers.arrayElement(SALE_UNITS),
    tiendas: seedProduct.tiendas.map((t) => ({
      eanTienda: t.eanTienda,
      nombreTienda: t.nombreTienda,
      cantidad: t.cantidad,
    })),
  }
}

/** Builds a `PurchaseOrderRecord` from one real seed order. Resolves the
 *  export's 3-value `ESTADO` into the platform's 4-value `OrderStatus` (see
 *  `FINAL_STATUS_SPLIT`'s doc comment) and fills the handful of fields the
 *  export never carries for a Cross-Docking order (buyer contact details —
 *  confirmed always blank for this order type, see the generator script) the
 *  same way the hand-transcribed sample this replaces did: fixed, since
 *  there's no actual per-order customer here (the whole shipment goes to one
 *  CEDI, not an end consumer). */
function buildPurchaseOrder(seedOrder: SeedOrder): PurchaseOrderRecord {
  let estado: OrderStatus
  let fechaCancelacion: IsoDateTime | null = null

  if (seedOrder.estadoRaw === 'PENDIENTE') {
    estado = 'PENDIENTE'
  } else if (seedOrder.estadoRaw === 'CANCELADO') {
    // The export has no order-level "cancelled" status of its own — modeled
    // here as an order that never progressed past PENDIENTE before being
    // cancelled, which `fechaCancelacion` (a field the record already has)
    // captures directly instead of inventing a 5th OrderStatus value.
    estado = 'PENDIENTE'
    fechaCancelacion = seedOrder.fechaEstadoFinal ?? seedOrder.fechaCreacion
  } else {
    estado = faker.helpers.arrayElement(FINAL_STATUS_SPLIT)
  }

  const productos = seedOrder.productos.map((p) => buildLineItem(p, estado))
  const costoTotalOc = productos.reduce(
    (sum, p) => sum + p.costoUnitario * p.cantidadSolicitada,
    0,
  )

  const ultimaActualizacionDate =
    seedOrder.fechaEstadoFinal ?? seedOrder.fechaCreacion
  const codigoSesionRecibo =
    estado === 'DESPACHADA' && faker.datatype.boolean(0.5)
      ? `REC-${ultimaActualizacionDate.slice(0, 10).replace(/-/g, '')}-${faker.number.int({ min: 1, max: 9 })}`
      : null

  return {
    ordenCompra: seedOrder.ordenCompra,
    eanPuntoEntrega: CEDI_FUNZA.ean,
    cliente: BUYER_ENTITY.nombre,
    ciudadEntrega: CEDI_FUNZA.ciudad,
    direccionEntrega: CEDI_FUNZA.direccion,
    barrioEntrega: CEDI_FUNZA.ciudad,
    departamentoEntrega: CEDI_FUNZA.departamento,
    codigoDaneEntrega: CEDI_FUNZA.codigoDane,
    facturacion: {
      barrio: CEDI_FUNZA.ciudad,
      ciudad: CEDI_FUNZA.ciudad,
      departamento: CEDI_FUNZA.departamento,
      direccion: CEDI_FUNZA.direccion,
    },
    estado,
    codigoSesionRecibo,
    fechaTransmision: seedOrder.fechaTransmision.slice(0, 10),
    ultimaActualizacion: ultimaActualizacionDate,
    productos,
    costoTotalOc,
    transportadora: seedOrder.transportadora,
    fechaMinEntrega: seedOrder.fechaMinEntrega,
    fechaMaxEntrega: seedOrder.fechaMaxEntrega,
    fechaCancelacion,
    sticker: faker.datatype.boolean(0.85) ? faker.string.numeric(12) : null,
    // Raw `TIPO_DE_OC` is always "RETAIL" for this slice of the export —
    // doesn't match the numeric-prefixed `TIPO_OC` format the backend spec
    // documents (e.g. "4-Venta Empresa"), but it's the real value Homecenter
    // sends; see CLAUDE.md's "Open items / unconfirmed with Homecenter".
    tipoOc: 'RETAIL',
    tipoDocumento: '1',
    notaPedido: `${faker.number.int({ min: 10, max: 99 })}-${faker.number.int({ min: 100_000, max: 999_999 })}`,
    // Buyer contact fields below are confirmed always blank for a
    // Cross-Docking order in the export (it ships to the CEDI, not an end
    // consumer) — fixed placeholders, same as the hand-transcribed sample
    // this generator replaces used.
    cedulaComprador: '1000000000',
    emailCliente: 'compras.pruebas@example.com',
    telefonoCliente: '+57 3000000000',
    clienteRecibe: 'Bodega CEDI Funza',
    eanTiendaVenta: CEDI_FUNZA.ean,
    eanTiendaFacturacion: CEDI_FUNZA.ean,
    localidad: CEDI_FUNZA.ean,
    eanEmpresaCompradora: BUYER_ENTITY.ean,
    tipoDeOrden: 'CROSS DOCKING',
    tipoEntrega: 'RETAIL',
    observaciones: CEDI_FUNZA.ciudad,
    observacionesNpc:
      seedOrder.observacionesNpc ??
      `Favor entregar en ${CEDI_FUNZA.direccion}.`,
    observacionesNpl: faker.string.alphanumeric(10).toUpperCase(),
    numPedido: faker.datatype.boolean(0.8)
      ? `${faker.number.int({ min: 10, max: 99 })}-${faker.number.int({ min: 100_000, max: 999_999 })}`
      : null,
    intentos: estado === 'CON_ERROR' ? faker.number.int({ min: 1, max: 2 }) : 0,
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
  const canonical = buildPurchaseOrder({
    ordenCompra: '8467343',
    estadoRaw: 'PENDIENTE',
    transportadora: '3-TRANSPORTES SODIMAC',
    observacionesNpc: null,
    fechaTransmision: '2026-06-01T12:00:00Z',
    fechaCreacion: '2026-06-01T12:00:00Z',
    fechaMinEntrega: '2026-06-12T00:00:00Z',
    fechaMaxEntrega: '2026-06-16T00:00:00Z',
    fechaEstadoFinal: null,
    productos: [
      {
        eanSku: '7703670004288',
        skuHomecenter: '412001',
        descripcion: 'MALLA ESLABONADA 1.8x10m METAL 2.1/4x2.1/4 2.5 mm',
        cantidadSolicitada: 30,
        costoUnitario: 89000,
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
        costoUnitario: 42500,
        tiendas: [
          {
            eanTienda: '7703670900306',
            nombreTienda: 'SODIMAC - CALI SUR',
            cantidad: 30,
          },
        ],
      },
    ],
  })
  canonical.cliente = 'Cali Sur'
  canonical.ciudadEntrega = 'Cali'
  canonical.eanPuntoEntrega = '7703670529804'
  canonical.direccionEntrega = 'Cra 12 N27-31, Tunja'
  db.purchaseOrders.push(canonical)

  // Real Homecenter Cross-Docking orders — see this module's doc comment and
  // scripts/generate-purchase-orders-seed.ts.
  for (const seedOrder of SEED_ORDERS) {
    db.purchaseOrders.push(buildPurchaseOrder(seedOrder))
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
