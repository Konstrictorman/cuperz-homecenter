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
  PARCIAL: { tone: 'processing', label: 'Parcial' },
  CANCELADA: { tone: 'error', label: 'Cancelada' },
  SUPERA_SOLICITADO: { tone: 'error', label: 'Supera solicitado' },
}

/** Filter bar uses badge tones; the API query wants the enum. */
const TONE_TO_ORDER_STATUS: Record<StatusBadgeTone, OrderStatus> = {
  pending: 'PENDIENTE',
  dispatched: 'DESPACHADA',
  error: 'CON_ERROR',
  processing: 'PROCESANDO',
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
    estadoTone: ui.tone,
    estadoLabel: ui.label,
    fecha: o.fechaOrden,
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
    fechaDesde: filters.fechaDesde || undefined,
    fechaHasta: filters.fechaHasta || undefined,
  }
}
