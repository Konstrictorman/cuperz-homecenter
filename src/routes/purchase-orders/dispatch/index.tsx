import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { GridPaginationModel } from '@mui/x-data-grid'
import DispatchOrdersFilterBar, {
  DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
} from './-DispatchOrdersFilterBar'
import DispatchOrdersTable from './-DispatchOrdersTable'
import type { DispatchOrder } from './-DispatchOrdersTable'
import DispatchOrderDetailModal from './-DispatchOrderDetailModal'
import GenerateLabelsModal from './-GenerateLabelsModal'
import GenerateDispatchNoticeModal from './-GenerateDispatchNoticeModal'
import {
  toDispatchOrderRow,
  toDispatchOrdersQuery,
} from './-dispatchOrderPresentation'
import type { DispatchOrdersFilterValues } from './-DispatchOrdersFilterBar'
import {
  dispatchPreviewsQueryOptions,
  useSendDispatchNotice,
} from '#/api/dispatch-notices'
import { downloadPurchaseOrderLabels } from '#/api/purchase-orders'
import { queryKeys } from '#/api/query-keys'
import { useFeedback } from '#/contexts/FeedbackContext'
import '../PurchaseOrdersPage.css'
import ErrorComponent from '#/components/errorComponent/ErrorComponent'

const DispatchOrdersPage = () => {
  const [filters, setFilters] = useState<DispatchOrdersFilterValues>(
    DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
  )

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  })

  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null)

  // `null` closed; otherwise the order whose barcode labels are being printed.
  const [labelsOrder, setLabelsOrder] = useState<DispatchOrder | null>(null)

  // `null` closed; otherwise the order whose dispatch notice is being sent.
  const [noticeOrder, setNoticeOrder] = useState<DispatchOrder | null>(null)

  const feedback = useFeedback()

  const queryClient = useQueryClient()

  const sendDispatchNotice = useSendDispatchNotice()

  const handleFilter = (values: DispatchOrdersFilterValues) => {
    setFilters(values)
    // a new filter invalidates whatever page we were on
    setPaginationModel((model) => ({ ...model, page: 0 }))
  }

  const { data, isError, error, isFetching } = useQuery({
    ...dispatchPreviewsQueryOptions({
      ...toDispatchOrdersQuery(filters),
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
    }),
    // keep the previous rows on screen (dimmed) while a new filter loads
    placeholderData: keepPreviousData,
  })

  const rows = (data?.ordenes ?? []).map(toDispatchOrderRow)

  const handleGenerateDispatchNotice = (order: DispatchOrder) => {
    setNoticeOrder(order)
  }

  const handleSendDispatchNotice = (
    order: DispatchOrder,
    fechaRealDespacho: string,
  ) => {
    return feedback.run(
      () =>
        sendDispatchNotice.mutateAsync({
          ordenCompra: order.ordenCompra,
          fechaRealDespacho,
        }),
      {
        success: `Se envió el aviso de despacho de la orden ${order.ordenCompra}.`,
        error: `No se pudo enviar el aviso de despacho de la orden ${order.ordenCompra}.`,
      },
    )
  }

  const handleGenerateBarCode = (order: DispatchOrder) => {
    setLabelsOrder(order)
  }

  const handleGenerateLabels = (order: DispatchOrder, numTags: number) =>
    feedback.run(
      () =>
        downloadPurchaseOrderLabels({
          ordenCompra: order.ordenCompra,
          numTags,
        }),
      {
        success:
          'Se descargaron las etiquetas de la orden satisfactoriamente. Por favor, revisa tu carpeta de descargas.',
        error: `No se pudieron generar las etiquetas de la orden ${order.ordenCompra}.`,
      },
    )

  return (
    <div className="purchase-orders">
      <DispatchOrdersFilterBar onFilter={handleFilter} />

      {isError ? (
        <ErrorComponent
          error={error}
          // Back to the first-load state (error cleared, table loading) and
          // refetched with the current filters and page.
          reset={() =>
            void queryClient.resetQueries({
              queryKey: queryKeys.dispatchNotices.all(),
            })
          }
          fallbackMessage="El servidor no respondió correctamente. Intenta de nuevo más tarde."
        />
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

      <GenerateLabelsModal
        order={labelsOrder}
        onClose={() => setLabelsOrder(null)}
        onSubmit={handleGenerateLabels}
      />

      <GenerateDispatchNoticeModal
        order={noticeOrder}
        onClose={() => setNoticeOrder(null)}
        onSubmit={handleSendDispatchNotice}
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
