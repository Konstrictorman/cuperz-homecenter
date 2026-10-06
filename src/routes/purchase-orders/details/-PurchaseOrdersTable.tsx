import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import type { GridRowSelectionModel } from '@mui/x-data-grid'
import DataTable from '#/components/dataTable/DataTable'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import ToolBar from '#/components/toolBar/ToolBar'
import { usePurchaseOrdersColumns } from './-usePurchaseOrdersColumns'
import { downloadPurchaseOrderPdf } from '#/api/purchase-orders'

export interface PurchaseOrder {
  id: string
  ordenCompra: string
  cliente: string
  ciudadEntrega: string
  tiendas: number
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
}: PurchaseOrdersTableProps) => {
  const [selection, setSelection] =
    useState<GridRowSelectionModel>(EMPTY_SELECTION)
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(
    null,
  )
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownloadPdf = async (order: PurchaseOrder) => {
    setDownloadingOrderId(order.id)
    try {
      await downloadPurchaseOrderPdf(order.ordenCompra)
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : `No se pudo generar el PDF de la orden ${order.ordenCompra}.`,
      )
    } finally {
      setDownloadingOrderId(null)
    }
  }

  const columns = usePurchaseOrdersColumns(
    onViewDetail,
    handleDownloadPdf,
    downloadingOrderId,
  )

  const selected = selectionCount(selection, rows.length)

  const clearSelection = () => setSelection(EMPTY_SELECTION)

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
      />
      <Snackbar
        open={downloadError !== null}
        autoHideDuration={6000}
        onClose={() => setDownloadError(null)}
      >
        <Alert severity="error" onClose={() => setDownloadError(null)}>
          {downloadError}
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
            label: 'Exportar',
            icon: <DownloadIcon fontSize="small" />,
            onClick: () => console.log('Exportar', selection),
          },
          {
            key: 'retry',
            label: 'Reinyectar',
            icon: <AutorenewOutlinedIcon fontSize="small" />,
            onClick: () => console.log('Reinyectar', selection),
          },
          {
            key: 'dispatch',
            label: 'Despachar',
            icon: <LocalShippingOutlinedIcon fontSize="small" />,
            onClick: () => console.log('Despachar', selection),
          },
        ]}
      />
    </>
  )
}

export default PurchaseOrdersTable
