import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Typography from '@mui/material/Typography'
import DispatchOrdersFilterBar, {
  DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
} from './-DispatchOrdersFilterBar'
import DispatchOrdersTable from './-DispatchOrdersTable'
import type { DispatchOrder } from './-DispatchOrdersTable'
import DispatchOrderDetailModal from './-DispatchOrderDetailModal'
import DispatchNoticePayloadModal from './-DispatchNoticePayloadModal'
import {
  toDispatchOrderRow,
  toDispatchOrdersQuery,
} from './-dispatchOrderPresentation'
import type { DispatchOrdersFilterValues } from './-DispatchOrdersFilterBar'
import { purchaseOrderDispatchListQueryOptions } from '#/api/purchase-order-dispatch'
import '../PurchaseOrdersPage.css'

const DispatchOrdersPage = () => {
  const [filters, setFilters] = useState<DispatchOrdersFilterValues>(
    DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
  )

  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null)

  // `null` closed; otherwise the `numPedido`s whose payload is being
  // previewed — one for the row action, several for the bulk one.
  const [dispatchNoticeNumPedidos, setDispatchNoticeNumPedidos] = useState<
    string[] | null
  >(null)

  const { data, isError, error, isFetching } = useQuery({
    ...purchaseOrderDispatchListQueryOptions(toDispatchOrdersQuery(filters)),
    // keep the previous rows on screen (dimmed) while a new filter loads
    placeholderData: keepPreviousData,
  })

  const rows = (data?.data ?? []).map(toDispatchOrderRow)

  const handleGenerateDispatchNotice = (order: DispatchOrder) => {
    setDispatchNoticeNumPedidos([order.numPedido])
  }

  const handleGenerateBarCode = (order: DispatchOrder) => {
    alert(`Generando código de barras para la orden ${order.ordenCompra}`)
  }

  return (
    <div className="purchase-orders">
      <DispatchOrdersFilterBar onFilter={setFilters} />

      {isError ? (
        <p role="alert">
          <Typography className="purchase-orders__error">
            No se pudieron cargar las órdenes: {error.message}
          </Typography>
        </p>
      ) : (
        <DispatchOrdersTable
          rows={rows}
          loading={isFetching}
          onViewDetail={setSelectedOrder}
          onGenerateDispatchNotice={handleGenerateDispatchNotice}
          onGenerateDispatchNoticeBulk={setDispatchNoticeNumPedidos}
          onGenerateBarCode={handleGenerateBarCode}
          detailOpen={
            selectedOrder !== null || dispatchNoticeNumPedidos !== null
          }
        />
      )}

      <DispatchOrderDetailModal
        order={selectedOrder}
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
      />

      <DispatchNoticePayloadModal
        numPedidos={dispatchNoticeNumPedidos ?? []}
        open={dispatchNoticeNumPedidos !== null}
        onClose={() => setDispatchNoticeNumPedidos(null)}
      />
    </div>
  )
}

export const Route = createFileRoute('/purchase-orders/dispatch/')({
  staticData: {
    crumb: 'Despachos',
  },
  component: DispatchOrdersPage,
})
