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
  PurchaseOrderLineItem,
  PurchaseOrderLineStore,
} from '#/api/types'

// --- Record shapes (superset of the API DTOs) ---

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
  fechaOrden: string
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
): Array<PurchaseOrderLineStore> {
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
): Array<{ eanTienda: string; items: Array<{ eanSku: string; cantidad: number }> }> {
  const byTienda = new Map<string, Array<{ eanSku: string; cantidad: number }>>()
  for (const producto of productos) {
    for (const tienda of producto.tiendas) {
      const items = byTienda.get(tienda.eanTienda) ?? []
      items.push({ eanSku: producto.eanSku, cantidad: tienda.cantidad })
      byTienda.set(tienda.eanTienda, items)
    }
  }
  return Array.from(byTienda, ([eanTienda, items]) => ({ eanTienda, items }))
}

function makePurchaseOrder(
  ordenCompra: string,
  status: OrderStatus,
): PurchaseOrderRecord {
  const deliveryPoint = faker.helpers.arrayElement(DELIVERY_POINTS)
  const orderDate = faker.date.recent({ days: 45 })
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
    fechaOrden: isoDate(orderDate),
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
        FECHA_TRANSMISION: order.fechaOrden.split('-').reverse().join('/'),
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
