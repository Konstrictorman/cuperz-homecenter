// Handler for `GET /avisos-despacho` — the live FastAPI backend's preview
// tree, not the § 2.2 list in docs/especificacion-endpoints-backend (see
// `DispatchPreviewsResponse` in #/api/types).
//
// Backed by a real response captured from that backend (2026-10-15) rather
// than faker — see dispatch-previews-seed.json, cloned into `db`. Every
// captured order still had `fechaRealDespacho: null`, so `DESPACHADO` and any
// date range return nothing here until an order is dispatched through the
// handlers below (also undocumented in the spec; per the Postman collection):
// `POST /avisos-despacho/enviar` stamps the real dispatch date and sends the
// notice; `PATCH /ordenes-compra/:ordenCompra` can also stamp the date.

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import { db, paginate } from '../data/db'
import type {
  DispatchPreviewsResponse,
  SendDispatchNoticeRequest,
  SendDispatchNoticeResponse,
  UpdatePurchaseOrderRequest,
} from '#/api/types'

function orderNotFound(ordenCompra: string) {
  return apiError(
    404,
    'ORDEN_NO_ENCONTRADA',
    `La orden de compra ${ordenCompra} no existe en el sistema.`,
  )
}

export const dispatchPreviewsHandlers = [
  http.get(`${API}/avisos-despacho`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const { page, pageSize } = readPageParams(url)
    const ordenCompra = url.searchParams.get('ordenCompra')
    const numpedido = url.searchParams.get('numpedido')
    const estado = url.searchParams.get('estado')
    const fechaDesde = url.searchParams.get('fechaDesde')
    const fechaHasta = url.searchParams.get('fechaHasta')

    // The real backend rejects a half-open range with this exact code.
    if (Boolean(fechaDesde) !== Boolean(fechaHasta)) {
      return apiError(
        422,
        'RANGO_FECHAS_INCOMPLETO',
        'fechaDesde y fechaHasta deben enviarse juntas.',
      )
    }

    const rows = db.dispatchPreviews
      .filter((o) => (ordenCompra ? o.ordenCompra.includes(ordenCompra) : true))
      .filter((o) => (numpedido ? o.numpedido?.includes(numpedido) : true))
      .filter((o) =>
        estado === 'DESPACHADO'
          ? o.fechaRealDespacho !== null
          : estado === 'NODESPACHADO'
            ? o.fechaRealDespacho === null
            : true,
      )
      .filter((o) =>
        fechaDesde
          ? o.fechaRealDespacho !== null &&
            withinRange(o.fechaRealDespacho, fechaDesde, fechaHasta)
          : true,
      )

    const { data, pagination } = paginate(rows, page, pageSize)
    return HttpResponse.json<DispatchPreviewsResponse>({
      ordenes: data,
      pagination,
    })
  }),

  // Writes through to both stores: a dispatch-preview order may or may not
  // also exist among the faker-backed purchase orders.
  http.patch(
    `${API}/ordenes-compra/:ordenCompra`,
    async ({ params, request }) => {
      await latency()
      const ordenCompra = String(params.ordenCompra)
      const preview = db.dispatchPreviews.find(
        (o) => o.ordenCompra === ordenCompra,
      )
      const order = db.purchaseOrders.find((o) => o.ordenCompra === ordenCompra)
      if (!preview && !order) return orderNotFound(ordenCompra)

      const body = (await request.json()) as UpdatePurchaseOrderRequest
      if (preview) preview.fechaRealDespacho = body.fechaDespacho
      if (order) {
        order.estado = body.estado
        order.fechaDespacho = body.fechaDespacho
      }
      return HttpResponse.json({ ordenCompra, ...body })
    },
  ),

  // Stamps the real dispatch date on both stores (like the PATCH above),
  // then "sends" the notice — which always succeeds here.
  http.post(`${API}/avisos-despacho/enviar`, async ({ request }) => {
    await latency()
    const body = (await request.json()) as SendDispatchNoticeRequest
    const { ordenCompra, fechaRealDespacho } = body
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaRealDespacho)) {
      return apiError(
        422,
        'PARAMETRO_INVALIDO',
        'fechaRealDespacho debe tener formato YYYY-MM-DD.',
      )
    }
    const preview = db.dispatchPreviews.find(
      (o) => o.ordenCompra === ordenCompra,
    )
    if (!preview) return orderNotFound(ordenCompra)

    preview.fechaRealDespacho = fechaRealDespacho
    const order = db.purchaseOrders.find((o) => o.ordenCompra === ordenCompra)
    if (order) order.fechaDespacho = fechaRealDespacho

    return HttpResponse.json<SendDispatchNoticeResponse>({
      ordenCompra,
      estado: 'EXITOSO',
      homecenter: { isError: false, errorMessage: null },
    })
  }),
]
