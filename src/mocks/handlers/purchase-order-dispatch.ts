// Handlers for Purchase Order Dispatch Status — not yet in
// docs/especificacion-endpoints-backend; see
// src/api/purchase-order-dispatch.ts's doc comment for how this pair
// relates to the avisoId-keyed Dispatch Notices API (dispatch-notices.ts).
//
// Backed by real legacy SIICUPERZ data (10.0.1.72) rather than faker — see
// scripts/generate-purchase-order-dispatch-seed.py and
// purchase-order-dispatch-seed.json. Read-only: unlike purchase-orders and
// dispatch-notices there's no create/mutate endpoint for this view yet, so
// this data isn't part of the mutable `db` store — it's loaded straight
// from the seed file.

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import { paginate } from '../data/db'
import purchaseOrderDispatchSeed from '../data/purchase-order-dispatch-seed.json'
import type {
  PurchaseOrderDispatchDetail,
  PurchaseOrderDispatchSummary,
} from '#/api/types'

const records = purchaseOrderDispatchSeed as Array<PurchaseOrderDispatchDetail>

function toSummary(
  record: PurchaseOrderDispatchDetail,
): PurchaseOrderDispatchSummary {
  return {
    eanPuntoEntrega: record.eanPuntoEntrega,
    ordenCompra: record.ordenCompra,
    numPedido: record.numPedido,
    fechaDespacho: record.fechaDespacho,
    estado: record.estado,
  }
}

export const purchaseOrderDispatchHandlers = [
  http.get(`${API}/ordenes-compra/despacho`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const { page, pageSize } = readPageParams(url)
    const ordenCompra = url.searchParams.get('ordenCompra')
    const numPedido = url.searchParams.get('numPedido')
    const estado = url.searchParams.get('estado')
    const fechaDesde = url.searchParams.get('fechaDespachoDesde')
    const fechaHasta = url.searchParams.get('fechaDespachoHasta')

    const rows = records
      .map(toSummary)
      .filter((r) => (ordenCompra ? r.ordenCompra.includes(ordenCompra) : true))
      .filter((r) => (numPedido ? r.numPedido.includes(numPedido) : true))
      .filter((r) => (estado ? r.estado === estado : true))
      .filter((r) =>
        r.fechaDespacho
          ? withinRange(r.fechaDespacho, fechaDesde, fechaHasta)
          : !fechaDesde && !fechaHasta,
      )
      .sort((a, b) =>
        (b.fechaDespacho ?? '').localeCompare(a.fechaDespacho ?? ''),
      )

    return HttpResponse.json(paginate(rows, page, pageSize))
  }),

  http.get(`${API}/ordenes-compra/despacho/:numPedido`, async ({ params }) => {
    await latency()
    const numPedido = String(params.numPedido)
    const record = records.find((r) => r.numPedido === numPedido)
    if (!record) {
      return apiError(
        404,
        'ORDEN_NO_ENCONTRADA',
        `No existe una orden de compra con numPedido ${numPedido}.`,
      )
    }
    return HttpResponse.json<PurchaseOrderDispatchDetail>(record)
  }),
]
