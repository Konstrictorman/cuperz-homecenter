// Handlers for § 3 — Integration Log (shared across all three processes).

import { HttpResponse, http } from 'msw'
import { API, apiError, latency, readPageParams, withinRange } from './shared'
import { db, paginate } from '../data/db'
import type { IntegrationLogSummary } from '#/api/types'

export const integrationLogHandlers = [
  // § 3.2
  http.get(`${API}/integracion-log`, async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const { page, pageSize } = readPageParams(url)
    const tipo = url.searchParams.get('tipo')
    const estado = url.searchParams.get('estado')
    const fechaDesde = url.searchParams.get('fechaDesde')
    const fechaHasta = url.searchParams.get('fechaHasta')

    const rows: Array<IntegrationLogSummary> = db.logs
      .filter((l) => (tipo ? l.tipo === tipo : true))
      .filter((l) => (estado ? l.estado === estado : true))
      .filter((l) => withinRange(l.fecha.slice(0, 10), fechaDesde, fechaHasta))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((l) => ({
        integracionLogId: l.integracionLogId,
        tipo: l.tipo,
        fecha: l.fecha,
        estado: l.estado,
        referencia: l.referencia,
      }))

    return HttpResponse.json(paginate(rows, page, pageSize))
  }),

  // § 3.1
  http.get(`${API}/integracion-log/:integracionLogId`, async ({ params }) => {
    await latency()
    const log = db.logs.find(
      (l) => l.integracionLogId === String(params.integracionLogId),
    )
    if (!log) {
      return apiError(
        404,
        'LOG_NO_ENCONTRADO',
        `No existe el registro de bitácora ${String(params.integracionLogId)}.`,
      )
    }
    return HttpResponse.json(log)
  }),
]
