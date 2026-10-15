import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Typography from '@mui/material/Typography'
import type { GridPaginationModel } from '@mui/x-data-grid'
import DispatchOrdersFilterBar, {
  DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
} from './-DispatchOrdersFilterBar'
import DispatchOrdersTable from './-DispatchOrdersTable'
import type { DispatchOrder } from './-DispatchOrdersTable'
import DispatchOrderDetailModal from './-DispatchOrderDetailModal'
import DispatchNoticePayloadModal from './-DispatchNoticePayloadModal'
import GenerateLabelsModal from './-GenerateLabelsModal'
import {
  toDispatchOrderRow,
  toDispatchOrdersQuery,
} from './-dispatchOrderPresentation'
import type { DispatchOrdersFilterValues } from './-DispatchOrdersFilterBar'
import { dispatchPreviewsByDateQueryOptions } from '#/api/dispatch-notices'
import { ApiError } from '#/api/http'
import { useDownloadPurchaseOrderLabels } from '#/api/purchase-orders'
import FeedbackSnackbar from '#/components/feedbackSnackbar/FeedbackSnackbar'
import type { FeedbackSnackbarProps } from '#/components/feedbackSnackbar/FeedbackSnackbar'
import LoadingBackdrop from '#/components/loadingBackdrop/LoadingBackdrop'
import '../PurchaseOrdersPage.css'

const DispatchOrdersPage = () => {
  const [filters, setFilters] = useState<DispatchOrdersFilterValues>(
    DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
  )

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  })

  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null)

  // `null` closed; otherwise the orders whose payload is being previewed.
  const [dispatchNoticeOrders, setDispatchNoticeOrders] = useState<
    DispatchOrder[] | null
  >(null)

  // `null` closed; otherwise the order whose barcode labels are being printed.
  const [labelsOrder, setLabelsOrder] = useState<DispatchOrder | null>(null)

  const [feedback, setFeedback] = useState<
    Pick<FeedbackSnackbarProps, 'open' | 'message' | 'severity'>
  >({ open: false, message: '', severity: 'info' })

  const downloadLabels = useDownloadPurchaseOrderLabels()

  const handleFilter = (values: DispatchOrdersFilterValues) => {
    setFilters(values)
    // a new filter invalidates whatever page we were on
    setPaginationModel((model) => ({ ...model, page: 0 }))
  }

  const { data, isError, error, isFetching } = useQuery({
    ...dispatchPreviewsByDateQueryOptions({
      ...toDispatchOrdersQuery(filters),
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
    }),
    // keep the previous rows on screen (dimmed) while a new filter loads
    placeholderData: keepPreviousData,
  })

  const rows = (data?.ordenes ?? []).map(toDispatchOrderRow)

  const handleGenerateDispatchNotice = (order: DispatchOrder) => {
    setDispatchNoticeOrders([order])
  }

  const handleGenerateBarCode = (order: DispatchOrder) => {
    setLabelsOrder(order)
  }

  const handleGenerateLabels = (order: DispatchOrder, numTags: number) => {
    downloadLabels.mutate(
      { ordenCompra: order.ordenCompra, numTags },
      {
        onSuccess: () =>
          setFeedback({
            open: true,
            severity: 'success',
            message:
              'Se descargaron las etiquetas de la orden satisfactoriamente. Por favor, revisa tu carpeta de descargas.',
          }),
        onError: (labelsError) =>
          setFeedback({
            open: true,
            severity: 'error',
            // only surface backend wording that's meant for people — not
            // ApiError's technical `METHOD path → status` fallback
            message:
              labelsError instanceof ApiError && labelsError.serverMessage
                ? labelsError.serverMessage
                : `No se pudieron generar las etiquetas de la orden ${order.ordenCompra}.`,
          }),
      },
    )
  }

  return (
    <div className="purchase-orders">
      <DispatchOrdersFilterBar onFilter={handleFilter} />

      {isError ? (
        <Typography role="alert" className="purchase-orders__error">
          No se pudieron cargar las órdenes: {error.message}
        </Typography>
      ) : (
        <DispatchOrdersTable
          rows={rows}
          loading={isFetching}
          rowCount={data?.pagination.total ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onViewDetail={setSelectedOrder}
          onGenerateDispatchNotice={handleGenerateDispatchNotice}
          onGenerateBarCode={handleGenerateBarCode}
        />
      )}

      <DispatchOrderDetailModal
        order={selectedOrder}
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
      />

      <DispatchNoticePayloadModal
        orders={dispatchNoticeOrders ?? []}
        open={dispatchNoticeOrders !== null}
        onClose={() => setDispatchNoticeOrders(null)}
      />

      <GenerateLabelsModal
        order={labelsOrder}
        onClose={() => setLabelsOrder(null)}
        onSubmit={handleGenerateLabels}
      />

      <LoadingBackdrop open={downloadLabels.isPending} />

      <FeedbackSnackbar
        {...feedback}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
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
