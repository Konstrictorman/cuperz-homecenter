// One-off build-time generator — NOT shipped to the browser. Reads the real
// Homecenter "Reporte Ordenes de Compra" export and writes a JSON seed file
// that `src/mocks/data/db.ts` imports synchronously, replacing the
// faker-generated / hand-transcribed purchase orders that used to live
// there.
//
// Re-run with: node scripts/generate-purchase-orders-seed.ts
// (only needed if the source .xlsx is replaced with a newer export).
//
// Scope: per CLAUDE.md this platform only models the Cross-Docking dispatch
// flow, so only rows whose TIPO_DE_ORDEN is "CROSS DOCKING" are kept — the
// other 231 orders in the export are direct-to-consumer marketplace orders
// with no store/container breakdown, which this platform's screens don't
// model at all (confirmed: every Cross-Docking row has a predistribution
// breakdown, every standard-order row has none — see the two counts in the
// export, nothing in between).

import ExcelJS from 'exceljs'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SOURCE_XLSX = fileURLToPath(
  new URL(
    '../docs/Reporte Ordenes de Compra_1791316031156.xlsx',
    import.meta.url,
  ),
)
const OUTPUT_JSON = fileURLToPath(
  new URL('../src/mocks/data/purchase-orders-seed.json', import.meta.url),
)

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

/** Raw `ESTADO`, collapsed to its 3 distinct values (never mixed within an
 *  order — every line of a given `ORDEN_COMPRA` carries the same one). */
type SeedEstadoRaw = 'PENDIENTE' | 'FINAL' | 'CANCELADO'

interface SeedOrder {
  ordenCompra: string
  estadoRaw: SeedEstadoRaw
  /** Raw `TRANSPORTADORA` — the only header field that varies order-to-order
   *  for this Cross-Docking slice (see the module doc comment: delivery
   *  point, buyer/billing entity and TIPO_DE_OC are constant across all of
   *  them, so `db.ts` hardcodes those rather than carrying them here). */
  transportadora: string
  /** Raw `OBSERVACIONES_NPC`; `null` on the ~13% of orders where the export
   *  itself leaves it blank. */
  observacionesNpc: string | null
  /** Raw `FECHA_TRANSMISION`, ISO datetime, `Z`-suffixed. */
  fechaTransmision: string
  /** Raw `FECHA_CREACION`, ISO datetime, `Z`-suffixed. */
  fechaCreacion: string
  /** Raw `FECHA_MIN_ENTREGA`, ISO datetime, `Z`-suffixed. */
  fechaMinEntrega: string
  /** Raw `FECHA_MAX_ENTREGA`, ISO datetime, `Z`-suffixed. */
  fechaMaxEntrega: string
  /** Raw `FECHA_ESTADO_FINAL`, ISO datetime, `Z`-suffixed; `null` for
   *  still-pending orders, and for the 3 cancelled orders the export itself
   *  never stamped with a final-state date. */
  fechaEstadoFinal: string | null
  productos: Array<SeedProduct>
}

function toIsoZ(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null
  return `${value}Z`
}

function toTrimmedOrNull(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed === '' ? null : trimmed
}

function toEstadoRaw(value: unknown): SeedEstadoRaw {
  if (value === '1-PENDIENTE') return 'PENDIENTE'
  if (value === '5-CANCELADO') return 'CANCELADO'
  if (value === '4-ESTADO FINAL') return 'FINAL'
  throw new Error(`Unexpected ESTADO value: ${String(value)}`)
}

async function main(): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(SOURCE_XLSX)
  const sheet = workbook.getWorksheet('Reporte')
  if (!sheet) throw new Error('Sheet "Reporte" not found in source workbook.')

  const headers: Array<string> = []
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value)
  })

  const orders = new Map<string, SeedOrder>()

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const get = (name: string): unknown => {
      const colNumber = headers.indexOf(name)
      return colNumber === -1 ? undefined : row.getCell(colNumber).value
    }

    if (get('TIPO_DE_ORDEN') !== 'CROSS DOCKING') return

    const ordenCompra = String(get('ORDEN_COMPRA'))
    let order = orders.get(ordenCompra)
    if (!order) {
      order = {
        ordenCompra,
        estadoRaw: toEstadoRaw(get('ESTADO')),
        transportadora: String(get('TRANSPORTADORA')),
        observacionesNpc: toTrimmedOrNull(get('OBSERVACIONES_NPC')),
        fechaTransmision: toIsoZ(get('FECHA_TRANSMISION'))!,
        fechaCreacion: toIsoZ(get('FECHA_CREACION'))!,
        fechaMinEntrega: toIsoZ(get('FECHA_MIN_ENTREGA'))!,
        fechaMaxEntrega: toIsoZ(get('FECHA_MAX_ENTREGA'))!,
        fechaEstadoFinal: toIsoZ(get('FECHA_ESTADO_FINAL')),
        productos: [],
      }
      orders.set(ordenCompra, order)
    }

    const skuHomecenter = String(get('SKU')).trim()
    let product = order.productos.find((p) => p.skuHomecenter === skuHomecenter)
    if (!product) {
      product = {
        eanSku: String(get('CODIGO_BARRAS')),
        skuHomecenter,
        descripcion: String(get('DESCRIPCION')).trim(),
        cantidadSolicitada: Number(get('CANTIDAD')),
        costoUnitario: Number(get('COSTO')),
        tiendas: [],
      }
      order.productos.push(product)
    }

    const eanTienda = get('EAN_PREDISTRIBUCION')
    if (eanTienda) {
      product.tiendas.push({
        eanTienda: String(eanTienda),
        nombreTienda: String(get('NOMBRE_PREDISTRIBUCION')),
        cantidad: Number(get('CANTIDAD_PREDISTRIBUCION')),
      })
    }
  })

  const seed = Array.from(orders.values()).sort((a, b) =>
    a.ordenCompra.localeCompare(b.ordenCompra),
  )

  writeFileSync(OUTPUT_JSON, `${JSON.stringify(seed, null, 2)}\n`)
  console.log(
    `Wrote ${seed.length} Cross-Docking orders (${seed.reduce((n, o) => n + o.productos.length, 0)} product lines) to ${OUTPUT_JSON}`,
  )
}

await main()
