import type { OrderStatus } from '#/api/types'

export type OrderStatusType =
  | 'pending'
  | 'dispatched'
  | 'error'
  | 'processing'
  | 'cancelled'
  | 'prepared'
  | 'received'
  /** Fallback for an `estado` this client doesn't know — see `orderStatusUi`. */
  | 'unknown'

/** API order status → badge tone + Spanish label. */
export const ORDER_STATUS_UI: Record<
  OrderStatus,
  { tone: OrderStatusType; label: string }
> = {
  PENDIENTE: { tone: 'pending', label: 'Pendiente' },
  DESPACHADO: { tone: 'dispatched', label: 'Despachada' },
  CON_ERROR: { tone: 'error', label: 'Error' },
  CANCELADA: { tone: 'cancelled', label: 'Cancelada' },
  PROCESANDO: { tone: 'processing', label: 'Procesando' },
  RECIBIDO: { tone: 'received', label: 'Recibida' },
  PREPARADO: { tone: 'prepared', label: 'Preparada' },
}

const UNKNOWN_ORDER_STATUS_UI = {
  tone: 'unknown',
  label: 'Unknown',
} as const

/** `ORDER_STATUS_UI` lookup that never returns `undefined`: an `estado`
 *  outside `OrderStatus` (e.g. a backend value this client predates) renders
 *  as "Desconocida" instead of crashing the row. */
export function orderStatusUi(estado: string): {
  tone: OrderStatusType
  label: string
} {
  return Object.hasOwn(ORDER_STATUS_UI, estado)
    ? ORDER_STATUS_UI[estado as OrderStatus]
    : UNKNOWN_ORDER_STATUS_UI
}

/** `unknown` has no API value to filter by. */
type FilterableOrderStatusType = Exclude<OrderStatusType, 'unknown'>

/** Filter bar uses badge tones; the API query wants the enum.
 *
 *  `partial`/`cancelled`/`exceeded` are line-level-only tones — `OrdersFilterBar`
 *  never offers them as an `estado` filter option (see `STATUS_OPTIONS`), so
 *  these three entries are unreachable in practice. They exist only to keep
 *  this `Record` exhaustive over the full `StatusBadgeTone` union; the
 *  `OrderStatus` each maps to is an arbitrary nearest-fit, not a real
 *  correspondence. */
export const TONE_TO_ORDER_STATUS: Record<
  FilterableOrderStatusType,
  OrderStatus
> = {
  pending: 'PENDIENTE',
  dispatched: 'DESPACHADO',
  error: 'CON_ERROR',
  processing: 'PROCESANDO',
  cancelled: 'CANCELADA',
  prepared: 'PREPARADO',
  received: 'RECIBIDO',
}

export type FilterStatusOrder = FilterableOrderStatusType | 'all'
