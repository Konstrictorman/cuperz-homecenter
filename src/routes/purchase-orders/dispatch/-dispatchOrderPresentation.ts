// Boundary mappers between the API DTOs (`#/api/types`) and the shapes this
// screen's table / filter bar already speak.

import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import type {
  PurchaseOrderDispatchQuery,
  PurchaseOrderDispatchStatus,
  PurchaseOrderDispatchSummary,
} from '#/api/types'
import type { DispatchOrdersFilterValues } from './-DispatchOrdersFilterBar'
import type { DispatchOrder } from './-DispatchOrdersTable'

/** API dispatch status → badge tone + Spanish label. */
export const DISPATCH_ORDER_STATUS_UI: Record<
  PurchaseOrderDispatchStatus,
  { tone: StatusBadgeTone; label: string }
> = {
  PENDIENTE: { tone: 'pending', label: 'Pendiente' },
  DESPACHADA: { tone: 'dispatched', label: 'Despachada' },
  CON_ERROR: { tone: 'error', label: 'Error' },
}

/** Filter bar uses badge tones; the API query wants the enum. */
const TONE_TO_DISPATCH_ORDER_STATUS: Record<
  Exclude<DispatchOrdersFilterValues['estado'], 'all'>,
  PurchaseOrderDispatchStatus
> = {
  pending: 'PENDIENTE',
  dispatched: 'DESPACHADA',
  error: 'CON_ERROR',
}

/** API list row → the shape `DispatchOrdersTable` renders. */
export function toDispatchOrderRow(
  o: PurchaseOrderDispatchSummary,
): DispatchOrder {
  const ui = DISPATCH_ORDER_STATUS_UI[o.estado]
  return {
    id: o.numPedido,
    ordenCompra: o.ordenCompra,
    numPedido: o.numPedido,
    eanPuntoEntrega: o.eanPuntoEntrega,
    fechaDespacho: o.fechaDespacho ?? '',
    estadoTone: ui.tone,
    estadoLabel: ui.label,
  }
}

/** Filter-bar values → API query params (`undefined` means "don't filter"). */
export function toDispatchOrdersQuery(
  filters: DispatchOrdersFilterValues,
): PurchaseOrderDispatchQuery {
  return {
    ordenCompra: filters.ordenCompra.trim() || undefined,
    numPedido: filters.numPedido.trim() || undefined,
    estado:
      filters.estado === 'all'
        ? undefined
        : TONE_TO_DISPATCH_ORDER_STATUS[filters.estado],
    fechaDespachoDesde: filters.fechaDesde || undefined,
    fechaDespachoHasta: filters.fechaHasta || undefined,
  }
}
