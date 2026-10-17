// Boundary mappers between the API DTOs (`#/api/types`) and the shapes this
// screen's table / modal / filter bar already speak.

import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import type {
  OrderStatus,
  PurchaseOrderSummary,
  PurchaseOrdersQuery,
} from '#/api/types'
import type { OrdersFilterValues } from './-OrdersFilterBar'
import type { PurchaseOrder } from './-PurchaseOrdersTable'

/** API order status → badge tone + Spanish label. */
const ORDER_STATUS_UI: Record<
  OrderStatus,
  { tone: StatusBadgeTone; label: string }
> = {
  PENDIENTE: { tone: 'pending', label: 'Pendiente' },
  DESPACHADO: { tone: 'dispatched', label: 'Despachada' },
  CON_ERROR: { tone: 'error', label: 'Error' },
  CANCELADA: { tone: 'cancelled', label: 'Cancelada' },
  PROCESANDO: { tone: 'processing', label: 'Procesando' },
  ALISTADO: { tone: 'partial', label: 'Alistada' },
  RECIBIDO: { tone: 'processing', label: 'Recibido' },
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
  dispatched: 'DESPACHADO',
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
    cliente: o.cliente ?? '',
    ciudadEntrega: o.ciudadEntrega ?? '',
    cantidadTotal: o.cantidadTotOc,
    costoTotalOc: o.costoTotOc,
    estadoTone: ui.tone,
    estadoLabel: ui.label,
    numPedido: o.numeroPedido ?? '',
    fechaTransmision: o.fechaTransmision,
    fechaMinEntrega: o.fechaMinEntrega ?? '',
    fechaMaxEntrega: o.fechaMaxEntrega ?? '',
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
