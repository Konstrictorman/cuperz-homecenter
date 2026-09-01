import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import OrdersFilterBar, {
  DEFAULT_ORDERS_FILTER_VALUES,
} from './OrdersFilterBar'
import PurchaseOrdersTable from './PurchaseOrdersTable'
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal'
import type { OrdersFilterValues } from './OrdersFilterBar'
import type { PurchaseOrder } from './PurchaseOrdersTable'
import { MOCK_PURCHASE_ORDERS } from './MOCK_PURCHASE_ORDERS'

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
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  )

  const rows = useMemo(
    () => filterPurchaseOrders(MOCK_PURCHASE_ORDERS, filters),
    [filters],
  )

  const onViewDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order)
  }

  return (
    <div className="@container flex flex-col gap-4 p-4 sm:p-6">
      <OrdersFilterBar onFilter={setFilters} />
      <PurchaseOrdersTable rows={rows} onViewDetail={onViewDetail} />
      <PurchaseOrderDetailModal
        order={selectedOrder}
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}

export const Route = createFileRoute('/purchase-orders/')({
  staticData: {
    crumb: 'Órdenes de compra',
  },
  component: PurchaseOrdersPage,
})
