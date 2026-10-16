// Boundary mappers between the API DTOs (`#/api/types`) and the shapes this
// screen's table / filter bar already speak.

import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import type {
  DispatchPreviewOrder,
  DispatchPreviewStatus,
  DispatchPreviewsQuery,
} from '#/api/types'
import type { DispatchOrdersFilterValues } from './-DispatchOrdersFilterBar'
import type { DispatchOrder } from './-DispatchOrdersTable'

/** API dispatch status → badge tone + Spanish label. */
export const DISPATCH_ORDER_STATUS_UI: Record<
  DispatchPreviewStatus,
  { tone: StatusBadgeTone; label: string }
> = {
  ALISTADO: { tone: 'partial', label: 'Alistada' },
  DESPACHADO: { tone: 'dispatched', label: 'Despachada' },
}

/** Filter bar uses badge tones; the API query wants the enum. */
const TONE_TO_DISPATCH_ORDER_STATUS: Record<
  Exclude<DispatchOrdersFilterValues['estado'], 'all'>,
  DispatchPreviewStatus
> = {
  ready: 'ALISTADO',
  dispatched: 'DESPACHADO',
  error: 'DESPACHADO',
  cancelled: 'DESPACHADO',
}

/** Trusts the backend's `estado`; a set `fechaRealDespacho` doesn't imply
 *  dispatched (`ALISTADO` orders carry one too). Only when `estado` is
 *  missing or unrecognised does the date serve as a best-effort fallback. */
const dispatchStatusOf = (o: DispatchPreviewOrder): DispatchPreviewStatus => {
  if (o.estado === 'ALISTADO' || o.estado === 'DESPACHADO') return o.estado
  return o.fechaRealDespacho ? 'DESPACHADO' : 'ALISTADO'
}

/** API order → the shape `DispatchOrdersTable` renders. */
export function toDispatchOrderRow(o: DispatchPreviewOrder): DispatchOrder {
  const ui = DISPATCH_ORDER_STATUS_UI[dispatchStatusOf(o)]
  return {
    id: o.ordenCompra,
    ordenCompra: o.ordenCompra,
    numpedido: o.numpedido || '',
    eanPuntoEntrega: o.eanPuntoEntrega,
    fechaRealDespacho: o.fechaRealDespacho ?? '',
    cantidadTiendas: o.tiendas.length,
    cantidadContenedores: o.tiendas.reduce(
      (sum, tienda) => sum + tienda.contenedores.length,
      0,
    ),
    estadoTone: ui.tone,
    estadoLabel: ui.label,
    source: o,
  }
}

/** Filter-bar values → API query params (`undefined` means "don't filter").
 *  The backend only accepts the date range as a pair — the filter bar
 *  enforces that before submitting. */
export function toDispatchOrdersQuery(
  filters: DispatchOrdersFilterValues,
): DispatchPreviewsQuery {
  const hasRange = Boolean(filters.fechaDesde && filters.fechaHasta)
  return {
    numpedido: filters.numpedido.trim() || undefined,
    ordenCompra: filters.ordenCompra.trim() || undefined,
    estado:
      filters.estado === 'all'
        ? undefined
        : TONE_TO_DISPATCH_ORDER_STATUS[filters.estado],
    fechaDesde: hasRange ? filters.fechaDesde : undefined,
    fechaHasta: hasRange ? filters.fechaHasta : undefined,
  }
}
