// Boundary mappers between the API DTOs (`#/api/types`) and the shapes this
// screen's table / modal / filter bar already speak.

import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import type {
  OrderLineStatus,
  OrderStatus,
  PurchaseOrderSummary,
  PurchaseOrdersQuery,
} from '#/api/types'
import type { OrdersFilterValues } from './OrdersFilterBar'
import type { PurchaseOrder } from './PurchaseOrdersTable'

/** API order status → badge tone + Spanish label. */
export const ORDER_STATUS_UI: Record<
  OrderStatus,
  { tone: StatusBadgeTone; label: string }
> = {
  PENDIENTE: { tone: 'pending', label: 'Pendiente' },
  DESPACHADA: { tone: 'dispatched', label: 'Despachada' },
  CON_ERROR: { tone: 'error', label: 'Error' },
  PROCESANDO: { tone: 'processing', label: 'Procesando' },
}

/** API line status → badge tone + Spanish label. */
export const ORDER_LINE_STATUS_UI: Record<
  OrderLineStatus,
  { tone: StatusBadgeTone; label: string }
> = {
  PENDIENTE: { tone: 'pending', label: 'Pendiente' },
  DESPACHADA: { tone: 'dispatched', label: 'Despachada' },
  PARCIAL: { tone: 'partial', label: 'Parcial' },
  CANCELADA: { tone: 'cancelled', label: 'Cancelada' },
  SUPERA_SOLICITADO: { tone: 'exceeded', label: 'Supera solicitado' },
}

/** Filter bar uses badge tones; the API query wants the enum.
 *
 *  `partial`/`cancelled`/`exceeded` are line-level-only tones — `OrdersFilterBar`
 *  never offers them as an `estado` filter option (see `STATUS_OPTIONS`), so
 *  these three entries are unreachable in practice. They exist only to keep
 *  this `Record` exhaustive over the full `StatusBadgeTone` union; the
 *  `OrderStatus` each maps to is an arbitrary nearest-fit, not a real
 *  correspondence. */
const TONE_TO_ORDER_STATUS: Record<StatusBadgeTone, OrderStatus> = {
  pending: 'PENDIENTE',
  dispatched: 'DESPACHADA',
  error: 'CON_ERROR',
  processing: 'PROCESANDO',
  partial: 'PROCESANDO',
  cancelled: 'CON_ERROR',
  exceeded: 'CON_ERROR',
}

/** API list row → the shape `PurchaseOrdersTable` renders. */
export function toPurchaseOrderRow(o: PurchaseOrderSummary): PurchaseOrder {
  const ui = ORDER_STATUS_UI[o.estado]
  return {
    id: o.ordenCompra,
    ordenCompra: o.ordenCompra,
    cliente: o.cliente,
    ciudadEntrega: o.ciudadEntrega,
    tiendas: o.cantidadTiendas,
    cantidadTotal: o.cantidadTotalSolicitada,
    costoTotalOc: o.costoTotalOc,
    estadoTone: ui.tone,
    estadoLabel: ui.label,
    fechaTransmision: o.fechaTransmision,
  }
}

/** Filter-bar values → API query params (`undefined` means "don't filter"). */
export function toPurchaseOrdersQuery(
  filters: OrdersFilterValues,
): PurchaseOrdersQuery {
  return {
    ordenCompra: filters.ordenCompra.trim() || undefined,
    estado:
      filters.estado === 'all'
        ? undefined
        : TONE_TO_ORDER_STATUS[filters.estado],
    fechaTransmisionDesde: filters.fechaTransmisionDesde || undefined,
    fechaTransmisionHasta: filters.fechaTransmisionHasta || undefined,
  }
}
