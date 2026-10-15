import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import type { SnackbarOrigin } from '@mui/material/Snackbar'
import type {
  GridPaginationModel,
  GridRowSelectionModel,
} from '@mui/x-data-grid'
import DataTable from '#/components/dataTable/DataTable'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import ToolBar from '#/components/toolBar/ToolBar'
import { usePurchaseOrdersColumns } from './-usePurchaseOrdersColumns'
import {
  downloadPurchaseOrderPdf,
  downloadPurchaseOrdersCsv,
  downloadPurchaseOrdersPdfZip,
} from '#/api/purchase-orders'
import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'
import '../SnackBar.css'

export interface PurchaseOrder {
  id: string
  ordenCompra: string
  cliente: string
  ciudadEntrega: string
  cantidadTotal: number
  costoTotalOc: number
  estadoTone: StatusBadgeTone
  estadoLabel: string
  numPedido: string
  fechaTransmision: string
  fechaMinEntrega: string
  fechaMaxEntrega: string
}

interface PurchaseOrdersTableProps {
  rows: PurchaseOrder[]
  loading?: boolean
  onViewDetail?: (order: PurchaseOrder) => void
  /** Whether the detail modal is currently open, so the toolbar can hide
   * and the row selection can clear while it's up. */
  detailOpen?: boolean
  /** Total row count across every page (`pagination.total` from the API) —
   *  `rows` only ever holds the current page, since `/ordenes-compra` paginates
   *  server-side. */
  rowCount: number
  paginationModel: GridPaginationModel
  onPaginationModelChange: (model: GridPaginationModel) => void
}

interface SnackBarState extends SnackbarOrigin {
  open: boolean
  message: string
  severity: 'error' | 'info' | 'success' | 'warning'
}

const EMPTY_SELECTION: GridRowSelectionModel = {
  type: 'include',
  ids: new Set(),
}

/** How many rows the current selection model covers. */
const selectionCount = (model: GridRowSelectionModel, total: number): number =>
  model.type === 'include' ? model.ids.size : total - model.ids.size

const PurchaseOrdersTable = ({
  rows,
  loading,
  onViewDetail,
  detailOpen = false,
  rowCount,
  paginationModel,
  onPaginationModelChange,
}: PurchaseOrdersTableProps) => {
  const [selection, setSelection] =
    useState<GridRowSelectionModel>(EMPTY_SELECTION)
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(
    null,
  )
  const [exportingSelection, setExportingSelection] = useState(false)
  const [downloadingSelectionPdf, setDownloadingSelectionPdf] = useState(false)
  const [snackbarStatus, setSnackbarStatus] = useState<SnackBarState>({
    open: false,
    message: '',
    severity: 'info',
    vertical: 'top',
    horizontal: 'center',
  })

  const handleDownloadPdf = async (order: PurchaseOrder) => {
    setDownloadingOrderId(order.id)
    try {
      await downloadPurchaseOrderPdf(order.ordenCompra)
      setSnackbarStatus({
        ...snackbarStatus,
        open: true,
        message:
          'Se descargó el PDF de la orden de compra satisfactoriamente. Por favor, revisa tu carpeta de descargas.',
        severity: 'success',
      })
    } catch (error) {
      setSnackbarStatus({
        ...snackbarStatus,
        open: true,
        message:
          error instanceof Error
            ? error.message
            : `No se pudo generar el PDF de la orden ${order.ordenCompra}.`,
        severity: 'error',
      })
    } finally {
      setDownloadingOrderId(null)
    }
  }

  const handleDownloadCsv = async (order: PurchaseOrder) => {
    setDownloadingOrderId(order.id)
    try {
      await downloadPurchaseOrdersCsv([order.ordenCompra])
      setSnackbarStatus({
        ...snackbarStatus,
        open: true,
        message:
          'Se exportó el CSV de la orden de compra satisfactoriamente. Por favor, revisa tu carpeta de descargas.',
        severity: 'success',
      })
    } catch (error) {
      setSnackbarStatus({
        ...snackbarStatus,
        open: true,
        message:
          error instanceof Error
            ? error.message
            : `No se pudo exportar el CSV de la orden ${order.ordenCompra}.`,
        severity: 'error',
      })
    } finally {
      setDownloadingOrderId(null)
    }
  }

  const columns = usePurchaseOrdersColumns(
    onViewDetail,
    handleDownloadPdf,
    handleDownloadCsv,
    downloadingOrderId,
  )

  const selected = selectionCount(selection, rows.length)

  const clearSelection = () => setSelection(EMPTY_SELECTION)

  // `rows` only ever holds the current page, so a `type: 'exclude'`
  // selection (from "Seleccionar todos") resolves to every row on the page,
  // not every row across the whole filtered result set.
  const selectedOrdenCompras =
    selection.type === 'include'
      ? rows
          .filter((row) => selection.ids.has(row.id))
          .map((row) => row.ordenCompra)
      : rows
          .filter((row) => !selection.ids.has(row.id))
          .map((row) => row.ordenCompra)

  const handleExportSelected = async () => {
    setExportingSelection(true)
    try {
      await downloadPurchaseOrdersCsv(selectedOrdenCompras)
      setSnackbarStatus({
        ...snackbarStatus,
        open: true,
        message:
          'Se exportaron los CSV de las órdenes seleccionadas se descargaron correctamente. Por favor, revisa tu carpeta de descargas.',
        severity: 'success',
      })
    } catch (error) {
      setSnackbarStatus({
        ...snackbarStatus,
        open: true,
        message:
          error instanceof Error
            ? error.message
            : 'No se pudieron exportar las órdenes seleccionadas.',
        severity: 'error',
      })
    } finally {
      setExportingSelection(false)
    }
  }

  const handleDownloadSelectedPdf = async () => {
    setDownloadingSelectionPdf(true)
    try {
      await downloadPurchaseOrdersPdfZip(selectedOrdenCompras)
      setSnackbarStatus({
        ...snackbarStatus,
        open: true,
        message:
          'Los PDF de las órdenes seleccionadas se descargaron correctamente. Por favor, revisa tu carpeta de descargas.',
        severity: 'success',
      })
    } catch (error) {
      setSnackbarStatus({
        ...snackbarStatus,
        open: true,
        message:
          error instanceof Error
            ? error.message
            : 'No se pudieron generar los PDF de las órdenes seleccionadas.',
        severity: 'error',
      })
    } finally {
      setDownloadingSelectionPdf(false)
    }
  }

  // Opening the detail modal shouldn't leave the selection toolbar floating
  // behind it — drop the selection so both disappear together.
  useEffect(() => {
    if (detailOpen) setSelection(EMPTY_SELECTION)
  }, [detailOpen])

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        rowSelectionModel={selection}
        onRowSelectionModelChange={setSelection}
        paginationMode="server"
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        initialState={{
          columns: { columnVisibilityModel: { cliente: false } },
        }}
      />
      <Snackbar
        open={snackbarStatus.open}
        autoHideDuration={6000}
        onClose={() => setSnackbarStatus({ ...snackbarStatus, open: false })}
        anchorOrigin={snackbarStatus}
      >
        <Alert
          className="snack-bar"
          severity={snackbarStatus.severity}
          onClose={() => setSnackbarStatus({ ...snackbarStatus, open: false })}
        >
          {snackbarStatus.message}
        </Alert>
      </Snackbar>
      <ToolBar
        blockInteraction={false}
        open={selected > 0 && !detailOpen}
        selected={selected}
        onSelectAll={() => setSelection({ type: 'exclude', ids: new Set() })}
        onClearSelection={clearSelection}
        onClose={clearSelection}
        actions={[
          {
            key: 'export',
            label: 'Exportar CSV',
            icon: <DownloadIcon fontSize="small" />,
            onClick: handleExportSelected,
            disabled: exportingSelection,
          },
          {
            key: 'download',
            label: 'Descargar PDF',
            icon: <PictureAsPdfIcon fontSize="small" />,
            onClick: handleDownloadSelectedPdf,
            disabled: downloadingSelectionPdf,
          },
        ]}
      />
      <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
        open={
          downloadingSelectionPdf ||
          exportingSelection ||
          downloadingOrderId !== null
        }
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  )
}

export default PurchaseOrdersTable
