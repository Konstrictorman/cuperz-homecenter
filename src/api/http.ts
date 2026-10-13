// Thin fetch wrapper for the platform's own backend (`/api/v1`).
// Every non-2xx response is normalised into an `ApiError`.

import { env } from '#/env'
import type { ApiErrorBody } from './types'

const API_PATH = '/api/v1'

/**
 * Same-origin `/api/v1` unless `VITE_API_BASE_URL` points at a real backend
 * (e.g. an ngrok tunnel in dev, or the deployed QA/Production host).
 */
export const API_BASE_URL = env.VITE_API_BASE_URL
  ? `${env.VITE_API_BASE_URL}${API_PATH}`
  : API_PATH

/**
 * ngrok's free tier serves an HTML interstitial to browser-looking requests
 * instead of proxying straight through, which would break JSON parsing here.
 * This header opts the tunnel out of that page — harmless against anything
 * else.
 */
const EXTRA_HEADERS: Record<string, string> = API_BASE_URL.includes('ngrok')
  ? { 'ngrok-skip-browser-warning': 'true' }
  : {}

/**
 * Dev-only readiness gate. When the MSW mock layer is enabled it registers a
 * promise here so no request leaves before the worker/server is intercepting.
 * In production this stays `undefined` and adds zero overhead.
 */
let mockGate: Promise<unknown> | undefined
export function setMockGate(promise: Promise<unknown>): void {
  mockGate = promise
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Array<unknown>

  constructor(status: number, body: unknown, fallback: string) {
    // `body` is whatever the server returned — don't trust it to match the type.
    const err = (body as Partial<ApiErrorBody> | undefined)?.error as
      Partial<ApiErrorBody['error']> | undefined
    // The real FastAPI backend returns `{ detail: { code } }` (no `message`),
    // unlike the mock's `{ error: { code, message, details } }` — accept both.
    const detail = (body as { detail?: { code?: string } } | undefined)?.detail
    super(err?.message ?? fallback)
    this.name = 'ApiError'
    this.status = status
    this.code = err?.code ?? detail?.code ?? 'ERROR_DESCONOCIDO'
    this.details = err?.details ?? []
  }
}

type QueryValue = string | number | boolean | null | undefined

export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** Extra headers (e.g. an auth bearer token once SSO is wired in). */
  headers?: Record<string, string>
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()
  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    return response.text()
  }
  return response.blob()
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal, headers } = options

  if (mockGate) await mockGate

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...EXTRA_HEADERS,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let errorBody: unknown
    try {
      errorBody = await response.json()
    } catch {
      errorBody = undefined
    }
    throw new ApiError(
      response.status,
      errorBody,
      `${method} ${path} → ${response.status}`,
    )
  }

  if (response.status === 204) return undefined as T
  return parseBody(response) as Promise<T>
}
