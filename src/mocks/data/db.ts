// In-memory store that backs the MSW handlers. Seeded once per process with a
// fixed faker seed so the "fake but real-looking" data is stable across reloads.
// Everything here is mutable: the create/resend/reprocess handlers write back.
//
// Note: object *keys* and enum string *values* stay in Spanish because they
// mirror Homecenter's real contract (see docs/mock-api.md). Only identifiers
// (types, functions, variables) are in English.

import { faker } from '@faker-js/faker'
import { CLIENTS, DELIVERY_POINTS, PRODUCTS, STORES } from './catalog'
import type {
  DispatchNoticeAttempt,
  DispatchNoticeStatus,
  DispatchNoticeStoreInput,
  HomecenterResult,
  IntegrationLogDetail,
  OrderLineStatus,
  OrderStatus,
  PurchaseOrderStore,
} from '#/api/types'

// --- Record shapes (superset of the API DTOs) ---

export interface PurchaseOrderRecord {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  ciudadEntrega: string
  direccionEntrega: string
  estado: OrderStatus
  codigoSesionRecibo: string | null
  fechaOrden: string
  ultimaActualizacion: string
  tiendas: Array<PurchaseOrderStore>
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

function buildPurchaseOrderStores(
  status: OrderStatus,
): Array<PurchaseOrderStore> {
  const stores = pickStores(faker.number.int({ min: 1, max: 3 }))
  return stores.map((store) => {
    const products = faker.helpers
      .arrayElements(PRODUCTS, faker.number.int({ min: 1, max: 4 }))
      .map((product) => {
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
        else if (status === 'CON_ERROR') estadoLinea = 'SUPERA_SOLICITADO'
        return {
          eanSku: product.eanSku,
          descripcion: product.descripcion,
          cantidadSolicitada,
          cantidadCancelada: cancelledQty,
          cantidadDevuelta: 0,
          estadoLinea,
        }
      })
    return { eanTienda: store.eanTienda, productos: products }
  })
}

function makePurchaseOrder(
  ordenCompra: string,
  status: OrderStatus,
): PurchaseOrderRecord {
  const deliveryPoint = faker.helpers.arrayElement(DELIVERY_POINTS)
  const orderDate = faker.date.recent({ days: 45 })
  const updatedAt = faker.date.between({ from: orderDate, to: new Date() })
  return {
    ordenCompra,
    eanPuntoEntrega: deliveryPoint.ean,
    cliente: faker.helpers.arrayElement(CLIENTS),
    ciudadEntrega: deliveryPoint.ciudad,
    direccionEntrega: deliveryPoint.direccion,
    estado: status,
    codigoSesionRecibo:
      status === 'DESPACHADA' && faker.datatype.boolean(0.5)
        ? `REC-${isoDate(updatedAt).replace(/-/g, '')}-${faker.number.int({ min: 1, max: 9 })}`
        : null,
    fechaOrden: isoDate(orderDate),
    ultimaActualizacion: isoDateTime(updatedAt),
    tiendas: buildPurchaseOrderStores(status),
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

function purchaseOrderToHomecenterResponse(order: PurchaseOrderRecord) {
  return {
    isError: false,
    errorMessage: null,
    ordenes: [
      {
        NUMERO_ORDEN: order.ordenCompra,
        EAN_PUNTO_ENTREGA: order.eanPuntoEntrega,
        FECHA_ORDEN: order.fechaOrden.split('-').reverse().join('/'),
        TIENDAS: order.tiendas.map((t) => ({
          EAN_TIENDA: t.eanTienda,
          PRODUCTOS: t.productos.map((p) => ({
            EAN_SKU: p.eanSku,
            DESCRIPCION: p.descripcion,
            CANTIDAD_SOLICITADA: p.cantidadSolicitada,
            ESTADO_SKU: p.estadoLinea,
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
  canonical.tiendas = [
    {
      eanTienda: '7703670900306',
      productos: [
        {
          eanSku: '7703670004288',
          descripcion: 'MALLA ESLABONADA 1.8x10m METAL 2.1/4x2.1/4 2.5 mm',
          cantidadSolicitada: 30,
          cantidadCancelada: 0,
          cantidadDevuelta: 0,
          estadoLinea: 'PENDIENTE',
        },
        {
          eanSku: '7703670004295',
          descripcion: 'PISO CERAMICA CALAMA BEIGE 51x51 CM CAJA x 1.30 M2',
          cantidadSolicitada: 30,
          cantidadCancelada: 0,
          cantidadDevuelta: 0,
          estadoLinea: 'PENDIENTE',
        },
      ],
    },
  ]
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
    const stores: Array<DispatchNoticeStoreInput> = order.tiendas.map(
      (t, ti) => ({
        eanTienda: t.eanTienda,
        contenedores: [
          {
            contenedor: `CONT${String(ti + 1).padStart(3, '0')}`,
            productos: t.productos.map((p) => ({
              eanSku: p.eanSku,
              cantidad: Math.max(
                1,
                Math.floor(
                  p.cantidadSolicitada *
                    faker.number.float({ min: 0.3, max: 1 }),
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
