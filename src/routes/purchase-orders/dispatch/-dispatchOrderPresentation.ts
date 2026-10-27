// Boundary mappers between the API DTOs (`#/api/types`) and the shapes this
// screen's table / filter bar already speak.

import type { DispatchPreviewOrder, DispatchPreviewsQuery } from '#/api/types'
import type { DispatchOrdersFilterValues } from './-DispatchOrdersFilterBar'
import type { DispatchOrder } from './-DispatchOrdersTable'
import { TONE_TO_ORDER_STATUS, orderStatusUi } from '../types'

/** API order → the shape `DispatchOrdersTable` renders. */
export function toDispatchOrderRow(o: DispatchPreviewOrder): DispatchOrder {
  const ui = orderStatusUi(o.estado)
  return {
    id: o.ordenCompra,
    ordenCompra: o.ordenCompra,
    numpedido: o.numpedido || '',
    eanPuntoEntrega: o.eanPuntoEntrega,
    fechaRealDespacho: o.fechaRealDespacho ?? '',
    fechaTransmision: o.fechaTransmision,
    cantidadTotal: Number(o.cantidadTotal),
    valorTotal: Number(o.valorTotal),
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
        : TONE_TO_ORDER_STATUS[filters.estado],
    fechaDesde: hasRange ? filters.fechaDesde : undefined,
    fechaHasta: hasRange ? filters.fechaHasta : undefined,
  }
}
