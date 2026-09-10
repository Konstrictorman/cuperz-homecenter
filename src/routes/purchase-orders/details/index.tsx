import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import OrdersFilterBar, {
  DEFAULT_ORDERS_FILTER_VALUES,
} from './OrdersFilterBar'
import PurchaseOrdersTable from './PurchaseOrdersTable'
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal'
import { toPurchaseOrderRow, toPurchaseOrdersQuery } from './orderPresentation'
import type { OrdersFilterValues } from './OrdersFilterBar'
import type { PurchaseOrder } from './PurchaseOrdersTable'
import { purchaseOrdersListQueryOptions } from '#/api/purchase-orders'
import './index.css'
import Typography from '@mui/material/Typography'

const PurchaseOrdersPage = () => {
  const [filters, setFilters] = useState<OrdersFilterValues>(
    DEFAULT_ORDERS_FILTER_VALUES,
  )
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  const { data, isError, error, isFetching } = useQuery({
    ...purchaseOrdersListQueryOptions(toPurchaseOrdersQuery(filters)),
    // keep the previous rows on screen (dimmed) while a new filter loads
    placeholderData: keepPreviousData,
  })

  const rows = (data?.data ?? []).map(toPurchaseOrderRow)

  return (
    <div className="purchase-orders">
      <OrdersFilterBar onFilter={setFilters} />

      {isError ? (
        <p role="alert" className="purchase-orders__error">
          <Typography>
            No se pudieron cargar las órdenes: {error.message}
          </Typography>
        </p>
      ) : (
        <PurchaseOrdersTable
          rows={rows}
          loading={isFetching}
          onViewDetail={setSelectedOrder}
        />
      )}

      <PurchaseOrderDetailModal
        order={selectedOrder}
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}

export const Route = createFileRoute('/purchase-orders/details/')({
  staticData: {
    crumb: 'Detalles',
  },
  component: PurchaseOrdersPage,
})
