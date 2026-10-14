import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { GridPaginationModel } from '@mui/x-data-grid'
import OrdersFilterBar, {
  DEFAULT_ORDERS_FILTER_VALUES,
} from './-OrdersFilterBar'
import PurchaseOrdersTable from './-PurchaseOrdersTable'
import PurchaseOrderDetailModal from './-PurchaseOrderDetailModal'
import { toPurchaseOrderRow, toPurchaseOrdersQuery } from './-orderPresentation'
import type { OrdersFilterValues } from './-OrdersFilterBar'
import type { PurchaseOrder } from './-PurchaseOrdersTable'
import { purchaseOrdersListQueryOptions } from '#/api/purchase-orders'
import '../PurchaseOrdersPage.css'
import Typography from '@mui/material/Typography'

const PurchaseOrdersPage = () => {
  const [filters, setFilters] = useState<OrdersFilterValues>(
    DEFAULT_ORDERS_FILTER_VALUES,
  )
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(
    { page: 0, pageSize: 10 },
  )
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  const handleFilter = (values: OrdersFilterValues) => {
    setFilters(values)
    // a new filter invalidates whatever page we were on
    setPaginationModel((model) => ({ ...model, page: 0 }))
  }

  const { data, isError, error, isFetching } = useQuery({
    ...purchaseOrdersListQueryOptions({
      ...toPurchaseOrdersQuery(filters),
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
    }),
    // keep the previous rows on screen (dimmed) while a new filter loads
    placeholderData: keepPreviousData,
  })

  const rows = (data?.data ?? []).map(toPurchaseOrderRow)

  return (
    <div className="purchase-orders">
      <OrdersFilterBar onFilter={handleFilter} />

      {isError ? (
        <Typography role="alert" className="purchase-orders__error">
          No se pudieron cargar las órdenes: {error.message}
        </Typography>
      ) : (
        <PurchaseOrdersTable
          rows={rows}
          loading={isFetching}
          onViewDetail={setSelectedOrder}
          detailOpen={selectedOrder !== null}
          rowCount={data?.pagination.total ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
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
