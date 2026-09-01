import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import OrdersFilterBar, {
  DEFAULT_ORDERS_FILTER_VALUES,
} from './OrdersFilterBar'
import PurchaseOrdersTable from './PurchaseOrdersTable'
import type { OrdersFilterValues } from './OrdersFilterBar'
import type { PurchaseOrder } from './PurchaseOrdersTable'

export const Route = createFileRoute('/purchase-orders/')({
  staticData: {
    crumb: 'Órdenes de compra',
  },
  component: PurchaseOrdersPage,
})

// Stands in for GetOrdenesDeCompra until the Homecenter integration backend
// exists (see CLAUDE.md's "Domain model reference" / hc_orden_compra).
const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: '8467343',
    ordenCompra: '8467343',
    cliente: 'Cali Sur',
    ciudadEntrega: 'Cali',
    tiendas: 2,
    cantidadTotal: 60,
    estadoTone: 'pending',
    estadoLabel: 'Pendiente',
    fecha: '2026-08-18',
  },
  {
    id: '17302836',
    ordenCompra: '17302836',
    cliente: 'Bogotá Norte',
    ciudadEntrega: 'Bogotá',
    tiendas: 2,
    cantidadTotal: 39,
    estadoTone: 'dispatched',
    estadoLabel: 'Despachado',
    fecha: '2026-08-20',
  },
  {
    id: '12174949',
    ordenCompra: '12174949',
    cliente: 'Bloque Cero S.A.S.',
    ciudadEntrega: 'Tunja',
    tiendas: 1,
    cantidadTotal: 317,
    estadoTone: 'error',
    estadoLabel: 'Error',
    fecha: '2026-08-22',
  },
  {
    id: '12175804',
    ordenCompra: '12175804',
    cliente: 'Bogotá D.C.',
    ciudadEntrega: 'Bogotá',
    tiendas: 1,
    cantidadTotal: 250,
    estadoTone: 'processing',
    estadoLabel: 'Procesando',
    fecha: '2026-08-25',
  },
]

function filterPurchaseOrders(
  orders: PurchaseOrder[],
  filters: OrdersFilterValues,
) {
  return orders.filter((order) => {
    const matchesOrden = filters.ordenCompra
      ? order.ordenCompra.includes(filters.ordenCompra.trim())
      : true
    const matchesEstado =
      filters.estado === 'all' || order.estadoTone === filters.estado
    const matchesDesde = filters.fechaDesde
      ? order.fecha >= filters.fechaDesde
      : true
    const matchesHasta = filters.fechaHasta
      ? order.fecha <= filters.fechaHasta
      : true

    return matchesOrden && matchesEstado && matchesDesde && matchesHasta
  })
}

const PurchaseOrdersPage = () => {
  const [filters, setFilters] = useState<OrdersFilterValues>(
    DEFAULT_ORDERS_FILTER_VALUES,
  )

  const rows = useMemo(
    () => filterPurchaseOrders(MOCK_PURCHASE_ORDERS, filters),
    [filters],
  )

  return (
    <div className="@container flex flex-col gap-4 p-4 sm:p-6">
      <OrdersFilterBar onFilter={setFilters} />
      <PurchaseOrdersTable rows={rows} />
    </div>
  )
}
