import { HttpResponse, delay } from 'msw'

// `*` prefix so the same patterns match in the browser (any dev origin) and in
// Node tests (msw/node no longer matches origin-less relative paths).
export const API = '*/api/v1'

/** Small artificial latency so loading states are visible in the UI. */
export function latency() {
  return delay(120 + Math.floor(Math.random() * 260))
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details: Array<unknown> = [],
) {
  return HttpResponse.json({ error: { code, message, details } }, { status })
}

export function readPageParams(url: URL) {
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20,
  }
}

export function withinRange(
  value: string,
  desde?: string | null,
  hasta?: string | null,
) {
  if (desde && value < desde) return false
  if (hasta && value > hasta) return false
  return true
}
