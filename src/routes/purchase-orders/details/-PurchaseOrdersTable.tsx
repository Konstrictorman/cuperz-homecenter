import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import { useEffect, useState } from 'react'
import type {
  GridPaginationModel,
  GridRowSelectionModel,
} from '@mui/x-data-grid'
import DataTable from '#/components/dataTable/DataTable'
import ToolBar from '#/components/toolBar/ToolBar'
import { usePurchaseOrdersColumns } from './-usePurchaseOrdersColumns'
import './PurchaseOrdersTable.css'
import type { OrderStatusType } from '../types'

export interface PurchaseOrder {
  id: string
  ordenCompra: string
  cliente: string
  ciudadEntrega: string
  cantidadTotal: number
  costoTotalOc: number
  estadoTone: OrderStatusType
  estadoLabel: string
  numPedido: string
  exportada: boolean
  observaciones: string
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
  onDownloadPdf: (order: PurchaseOrder) => void
  onDownloadCsv: (order: PurchaseOrder) => void
  /** Bulk toolbar actions — receive the selected rows' `ordenCompra`s. */
  onExportSelected: (ordenCompras: Array<string>) => void
  onDownloadSelectedPdf: (ordenCompras: Array<string>) => void
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
  onDownloadPdf,
  onDownloadCsv,
  onExportSelected,
  onDownloadSelectedPdf,
}: PurchaseOrdersTableProps) => {
  const [selection, setSelection] =
    useState<GridRowSelectionModel>(EMPTY_SELECTION)

  const columns = usePurchaseOrdersColumns(
    onViewDetail,
    onDownloadPdf,
    onDownloadCsv,
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
        // Not-yet-exported orders read like unread mail: bold, with an accent
        // bar, so new work stands out until it's been exported.
        getRowClassName={({ row }) =>
          row.exportada ? '' : 'purchase-orders-table__row--unexported'
        }
        initialState={{
          columns: { columnVisibilityModel: { cliente: false } },
        }}
      />
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
            onClick: () => onExportSelected(selectedOrdenCompras),
          },
          {
            key: 'download',
            label: 'Descargar PDF',
            icon: <PictureAsPdfIcon fontSize="small" />,
            onClick: () => onDownloadSelectedPdf(selectedOrdenCompras),
          },
        ]}
      />
    </>
  )
}

export default PurchaseOrdersTable
