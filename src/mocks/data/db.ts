// In-memory store that backs the MSW handlers. Seeded once per process with a
// fixed faker seed so the "fake but real-looking" data is stable across reloads.
// Everything here is mutable: POST/reenviar/reinyectar handlers write back to it.

import { faker } from '@faker-js/faker'
import { CLIENTES, PRODUCTOS, PUNTOS_ENTREGA, TIENDAS } from './catalogo'
import type {
  AvisoIntento,
  AvisoTiendaInput,
  EstadoAviso,
  EstadoLineaOrden,
  EstadoOrden,
  HomecenterResultado,
  IntegracionLogDetalle,
  OrdenCompraTienda,
} from '#/api/types'

// --- Record shapes (superset of the API DTOs) ---

export interface OrdenRecord {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  ciudadEntrega: string
  direccionEntrega: string
  estado: EstadoOrden
  codigoSesionRecibo: string | null
  fechaOrden: string
  ultimaActualizacion: string
  tiendas: Array<OrdenCompraTienda>
  /** Reprocessing attempts (§ 1.4). */
  intentos: number
  maxIntentos: number
}

export interface AvisoRecord {
  avisoId: string
  ordenCompra: string
  fechaRealDespacho: string
  enviarInmediatamente: boolean
  tiendas: Array<AvisoTiendaInput>
  estado: EstadoAviso
  intentos: number
  integracionLogId: string | null
  fechaEnvio: string | null
  homecenter: HomecenterResultado
  historialIntentos: Array<AvisoIntento>
}

export type LogRecord = IntegracionLogDetalle

interface MockDb {
  ordenes: Array<OrdenRecord>
  avisos: Array<AvisoRecord>
  logs: Array<LogRecord>
  seq: {
    logByDay: Record<string, number>
    avisoByOrden: Record<string, number>
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

export function nextAvisoId(db: MockDb, ordenCompra: string): string {
  const n = (db.seq.avisoByOrden[ordenCompra] ?? 0) + 1
  db.seq.avisoByOrden[ordenCompra] = n
  return `av-${ordenCompra}-${String(n).padStart(3, '0')}`
}

export function nextSyncId(db: MockDb): string {
  db.seq.sync += 1
  const day = isoDate(new Date()).replace(/-/g, '')
  return `sync-${day}-${String(db.seq.sync).padStart(4, '0')}`
}

/** Deterministic-ish EAN128 (SSCC-shaped, 18 digits). */
export function generarEan128(contenedor: string, eanSku: string): string {
  const base = `${contenedor}${eanSku}`
  let hash = 0
  for (const ch of base) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `37${String(hash).padStart(16, '0').slice(0, 16)}`
}

// --- Seed ---

const ESTADOS_ORDEN: Array<EstadoOrden> = [
  'PENDIENTE',
  'PENDIENTE',
  'PROCESANDO',
  'DESPACHADA',
  'DESPACHADA',
  'CON_ERROR',
]

function pickTiendas(count: number) {
  return faker.helpers.arrayElements(TIENDAS, count)
}

function buildOrdenTiendas(estado: EstadoOrden): Array<OrdenCompraTienda> {
  const tiendas = pickTiendas(faker.number.int({ min: 1, max: 3 }))
  return tiendas.map((tienda) => {
    const productos = faker.helpers
      .arrayElements(PRODUCTOS, faker.number.int({ min: 1, max: 4 }))
      .map((prod) => {
        const cantidadSolicitada = faker.number.int({ min: 10, max: 400 })
        const cancelada =
          estado === 'CON_ERROR' && faker.datatype.boolean(0.4)
            ? faker.number.int({
                min: 1,
                max: Math.floor(cantidadSolicitada / 4),
              })
            : 0
        let estadoLinea: EstadoLineaOrden = 'PENDIENTE'
        if (estado === 'DESPACHADA') estadoLinea = 'DESPACHADA'
        else if (estado === 'PROCESANDO') estadoLinea = 'PARCIAL'
        else if (estado === 'CON_ERROR') estadoLinea = 'SUPERA_SOLICITADO'
        return {
          eanSku: prod.eanSku,
          descripcion: prod.descripcion,
          cantidadSolicitada,
          cantidadCancelada: cancelada,
          cantidadDevuelta: 0,
          estadoLinea,
        }
      })
    return { eanTienda: tienda.eanTienda, productos }
  })
}

function makeOrden(ordenCompra: string, estado: EstadoOrden): OrdenRecord {
  const punto = faker.helpers.arrayElement(PUNTOS_ENTREGA)
  const fecha = faker.date.recent({ days: 45 })
  const actualizada = faker.date.between({ from: fecha, to: new Date() })
  return {
    ordenCompra,
    eanPuntoEntrega: punto.ean,
    cliente: faker.helpers.arrayElement(CLIENTES),
    ciudadEntrega: punto.ciudad,
    direccionEntrega: punto.direccion,
    estado,
    codigoSesionRecibo:
      estado === 'DESPACHADA' && faker.datatype.boolean(0.5)
        ? `REC-${isoDate(actualizada).replace(/-/g, '')}-${faker.number.int({ min: 1, max: 9 })}`
        : null,
    fechaOrden: isoDate(fecha),
    ultimaActualizacion: isoDateTime(actualizada),
    tiendas: buildOrdenTiendas(estado),
    intentos: estado === 'CON_ERROR' ? faker.number.int({ min: 1, max: 2 }) : 0,
    maxIntentos: 3,
  }
}

function ordenToHomecenterRequest(orden: OrdenRecord) {
  return {
    metodo: 'GetOrdenesDeCompra',
    filtros: { ordenCompra: orden.ordenCompra, modo: 'INCREMENTAL' },
  }
}

function ordenToHomecenterResponse(orden: OrdenRecord) {
  return {
    isError: false,
    errorMessage: null,
    ordenes: [
      {
        NUMERO_ORDEN: orden.ordenCompra,
        EAN_PUNTO_ENTREGA: orden.eanPuntoEntrega,
        FECHA_ORDEN: orden.fechaOrden.split('-').reverse().join('/'),
        TIENDAS: orden.tiendas.map((t) => ({
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

function avisoToHomecenterRequest(aviso: AvisoRecord) {
  return {
    OrdenCompra: aviso.ordenCompra,
    FechaRealDespacho: aviso.fechaRealDespacho.split('-').reverse().join('/'),
    Tiendas: aviso.tiendas.map((t) => ({
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
    ordenes: [],
    avisos: [],
    logs: [],
    seq: { logByDay: {}, avisoByOrden: {}, sync: 90 },
  }

  // Canonical order from the spec so its documented examples resolve.
  const canonical = makeOrden('8467343', 'PENDIENTE')
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
  db.ordenes.push(canonical)

  // 44 more generated orders.
  for (let i = 0; i < 44; i += 1) {
    const ordenCompra = String(
      faker.number.int({ min: 12_000_000, max: 22_999_999 }),
    )
    const estado = faker.helpers.arrayElement(ESTADOS_ORDEN)
    db.ordenes.push(makeOrden(ordenCompra, estado))
  }

  // One ORDEN_COMPRA_SYNC log per order (the last sync that brought it in).
  for (const orden of db.ordenes) {
    const when = new Date(orden.ultimaActualizacion)
    const id = nextLogId(db, when)
    db.logs.push({
      integracionLogId: id,
      tipo: 'ORDEN_COMPRA_SYNC',
      fecha: isoDateTime(when),
      estado: orden.estado === 'CON_ERROR' ? 'FALLIDO' : 'EXITOSO',
      referencia: orden.ordenCompra,
      requestEnviado: ordenToHomecenterRequest(orden),
      respuestaRecibida: ordenToHomecenterResponse(orden),
    })
  }

  // Dispatch notices for a slice of the dispatched / processing orders.
  const candidatas = db.ordenes.filter(
    (o) => o.estado === 'DESPACHADA' || o.estado === 'PROCESANDO',
  )
  for (const orden of faker.helpers.arrayElements(
    candidatas,
    Math.min(candidatas.length, 12),
  )) {
    const estado = faker.helpers.arrayElement<EstadoAviso>([
      'BORRADOR',
      'ENVIADO',
      'ENVIADO',
      'CON_NOVEDAD',
      'ERROR_ENVIO',
    ])
    const despachadaEl = faker.date.recent({ days: 20 })
    const tiendas: Array<AvisoTiendaInput> = orden.tiendas.map((t, ti) => ({
      eanTienda: t.eanTienda,
      contenedores: [
        {
          contenedor: `CONT${String(ti + 1).padStart(3, '0')}`,
          productos: t.productos.map((p) => ({
            eanSku: p.eanSku,
            cantidad: Math.max(
              1,
              Math.floor(
                p.cantidadSolicitada * faker.number.float({ min: 0.3, max: 1 }),
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
    }))

    const avisoId = nextAvisoId(db, orden.ordenCompra)
    const aviso: AvisoRecord = {
      avisoId,
      ordenCompra: orden.ordenCompra,
      fechaRealDespacho: isoDate(despachadaEl),
      enviarInmediatamente: estado !== 'BORRADOR',
      tiendas,
      estado,
      intentos: 0,
      integracionLogId: null,
      fechaEnvio: null,
      homecenter: { isError: false, errorMessage: null },
      historialIntentos: [],
    }

    if (estado !== 'BORRADOR') {
      const when = despachadaEl
      const logId = nextLogId(db, when)
      aviso.intentos = 1
      aviso.integracionLogId = logId
      aviso.fechaEnvio = isoDateTime(when)

      if (estado === 'CON_NOVEDAD') {
        const linea = tiendas[0].contenedores[0].productos[0]
        aviso.homecenter = {
          isError: false,
          errorMessage: 'Se presentaron errores en algunos items ver resultado',
          detalle: [
            {
              eanSku: linea.eanSku,
              eanTienda: tiendas[0].eanTienda,
              mensaje: `El producto:'${linea.eanSku}' dirigido a la tienda:'${tiendas[0].eanTienda}' supera la cantidad solicitada`,
            },
          ],
        }
      } else if (estado === 'ERROR_ENVIO') {
        aviso.homecenter = {
          isError: true,
          errorMessage: 'Homecenter no disponible (timeout tras 30s)',
        }
      }

      aviso.historialIntentos.push({
        numero: 1,
        fecha: isoDateTime(when),
        estado,
        integracionLogId: logId,
      })

      db.logs.push({
        integracionLogId: logId,
        tipo: 'AVISO_DESPACHO',
        fecha: isoDateTime(when),
        estado:
          estado === 'ENVIADO'
            ? 'EXITOSO'
            : estado === 'CON_NOVEDAD'
              ? 'CON_NOVEDAD'
              : 'FALLIDO',
        referencia: avisoId,
        requestEnviado: avisoToHomecenterRequest(aviso),
        respuestaRecibida: aviso.homecenter,
      })
    }

    db.avisos.push(aviso)
  }

  // Sort logs newest-first for the bitácora screen.
  db.logs.sort((a, b) => b.fecha.localeCompare(a.fecha))
  return db
}

// --- Singleton ---

export const db: MockDb = seed()

export function resetDb(): void {
  const fresh = seed()
  db.ordenes = fresh.ordenes
  db.avisos = fresh.avisos
  db.logs = fresh.logs
  db.seq = fresh.seq
}

export { avisoToHomecenterRequest }
