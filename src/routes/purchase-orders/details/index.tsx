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
import {
  downloadPurchaseOrderPdf,
  downloadPurchaseOrdersCsv,
  downloadPurchaseOrdersPdfZip,
  purchaseOrdersListQueryOptions,
} from '#/api/purchase-orders'
import { userFacingErrorMessage } from '#/api/http'
import FeedbackSnackbar, {
  CLOSED_FEEDBACK,
} from '#/components/feedbackSnackbar/FeedbackSnackbar'
import type { FeedbackSnackbarState } from '#/components/feedbackSnackbar/FeedbackSnackbar'
import LoadingBackdrop from '#/components/loadingBackdrop/LoadingBackdrop'
import '../PurchaseOrdersPage.css'
import Typography from '@mui/material/Typography'

const PurchaseOrdersPage = () => {
  const [filters, setFilters] = useState<OrdersFilterValues>(
    DEFAULT_ORDERS_FILTER_VALUES,
  )
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  })
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(
    null,
  )
  const [exportingSelection, setExportingSelection] = useState(false)
  const [downloadingSelectionPdf, setDownloadingSelectionPdf] = useState(false)
  const [feedback, setFeedback] =
    useState<FeedbackSnackbarState>(CLOSED_FEEDBACK)

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

  /** Runs one download, flagging it busy meanwhile and reporting the
   *  outcome in the snackbar. */
  const runDownload = async (
    download: () => Promise<void>,
    setBusy: (busy: boolean) => void,
    successMessage: string,
    errorFallback: string,
  ) => {
    setBusy(true)
    try {
      await download()
      setFeedback({ open: true, severity: 'success', message: successMessage })
    } catch (downloadError) {
      setFeedback({
        open: true,
        severity: 'error',
        message: userFacingErrorMessage(downloadError, errorFallback),
      })
    } finally {
      setBusy(false)
    }
  }

  const handleDownloadPdf = (order: PurchaseOrder) =>
    runDownload(
      () => downloadPurchaseOrderPdf(order.ordenCompra),
      (busy) => setDownloadingOrderId(busy ? order.id : null),
      'Se descargó el PDF de la orden de compra satisfactoriamente. Por favor, revisa tu carpeta de descargas.',
      `No se pudo generar el PDF de la orden ${order.ordenCompra}.`,
    )

  const handleDownloadCsv = (order: PurchaseOrder) =>
    runDownload(
      () => downloadPurchaseOrdersCsv([order.ordenCompra]),
      (busy) => setDownloadingOrderId(busy ? order.id : null),
      'Se exportó el CSV de la orden de compra satisfactoriamente. Por favor, revisa tu carpeta de descargas.',
      `No se pudo exportar el CSV de la orden ${order.ordenCompra}.`,
    )

  const handleExportSelected = (ordenCompras: Array<string>) =>
    runDownload(
      () => downloadPurchaseOrdersCsv(ordenCompras),
      setExportingSelection,
      'Los CSV de las órdenes seleccionadas se exportaron correctamente. Por favor, revisa tu carpeta de descargas.',
      'No se pudieron exportar las órdenes seleccionadas.',
    )

  const handleDownloadSelectedPdf = (ordenCompras: Array<string>) =>
    runDownload(
      () => downloadPurchaseOrdersPdfZip(ordenCompras),
      setDownloadingSelectionPdf,
      'Los PDF de las órdenes seleccionadas se descargaron correctamente. Por favor, revisa tu carpeta de descargas.',
      'No se pudieron generar los PDF de las órdenes seleccionadas.',
    )

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
          onDownloadPdf={handleDownloadPdf}
          onDownloadCsv={handleDownloadCsv}
          onExportSelected={handleExportSelected}
          onDownloadSelectedPdf={handleDownloadSelectedPdf}
          downloadingOrderId={downloadingOrderId}
          exportingSelection={exportingSelection}
          downloadingSelectionPdf={downloadingSelectionPdf}
        />
      )}

      <PurchaseOrderDetailModal
        order={selectedOrder}
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
      />

      <LoadingBackdrop
        open={
          downloadingOrderId !== null ||
          exportingSelection ||
          downloadingSelectionPdf
        }
      />

      <FeedbackSnackbar
        {...feedback}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
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
