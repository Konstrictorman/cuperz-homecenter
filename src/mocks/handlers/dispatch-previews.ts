// Handler for `GET /avisos-despacho/por-fecha` — not in
// docs/especificacion-endpoints-backend; mirrors the live FastAPI backend
// (see `DispatchPreviewsByDateResponse` in #/api/types).
//
// Backed by a real response captured from that backend (2026-10-15) rather
// than faker — see dispatch-previews-seed.json. Read-only, so it's loaded
// straight from the seed instead of living in the mutable `db` store. Every
// captured order still had `fechaRealDespacho: null`, so `DESPACHADO` and any
// date range legitimately return nothing here, same as the real backend did.

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import { paginate } from '../data/db'
import dispatchPreviewsSeed from '../data/dispatch-previews-seed.json'
import type {
  DispatchPreviewOrder,
  DispatchPreviewsByDateResponse,
} from '#/api/types'

const orders = dispatchPreviewsSeed as Array<DispatchPreviewOrder>

export const dispatchPreviewsHandlers = [
  http.get(`${API}/avisos-despacho/por-fecha`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const { page, pageSize } = readPageParams(url)
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

    const rows = orders
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
    return HttpResponse.json<DispatchPreviewsByDateResponse>({
      ordenes: data,
      pagination,
    })
  }),
]
