// Boundary mappers between the API DTOs (`#/api/types`) and the shapes this
// screen's table / modal / filter bar already speak.

import type { PurchaseOrderSummary, PurchaseOrdersQuery } from '#/api/types'
import type { OrdersFilterValues } from './-OrdersFilterBar'
import type { PurchaseOrder } from './-PurchaseOrdersTable'
import { TONE_TO_ORDER_STATUS, orderStatusUi } from '../types'

/** API list row → the shape `PurchaseOrdersTable` renders. */
export function toPurchaseOrderRow(o: PurchaseOrderSummary): PurchaseOrder {
  const ui = orderStatusUi(o.estado)
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
    exportada: o.exportada,
    observaciones: o.observaciones ?? '',
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
