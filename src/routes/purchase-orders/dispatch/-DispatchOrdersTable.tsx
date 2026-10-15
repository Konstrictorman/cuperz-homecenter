import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import { useEffect, useState } from 'react'
import type {
  GridPaginationModel,
  GridRowSelectionModel,
} from '@mui/x-data-grid'
import type { DispatchPreviewOrder } from '#/api/types'
import DataTable from '#/components/dataTable/DataTable'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import ToolBar from '#/components/toolBar/ToolBar'
import { useDispatchOrdersColumns } from './-useDispatchOrdersColumns'

export interface DispatchOrder {
  /** == `ordenCompra` — the only per-order key the API returns. */
  id: string
  ordenCompra: string
  eanPuntoEntrega: string
  /** `''` while not yet dispatched. */
  fechaRealDespacho: string
  cantidadTiendas: number
  cantidadContenedores: number
  estadoTone: StatusBadgeTone
  estadoLabel: string
  /** The untouched API order — its Tienda→Contenedor→Producto tree feeds the
   *  detail modal and the payload preview without another request. */
  source: DispatchPreviewOrder
}

interface DispatchOrdersTableProps {
  rows: DispatchOrder[]
  loading?: boolean
  rowCount: number
  paginationModel: GridPaginationModel
  onPaginationModelChange: (model: GridPaginationModel) => void
  onViewDetail?: (order: DispatchOrder) => void
  onGenerateDispatchNotice?: (order: DispatchOrder) => void
  /** Bulk/toolbar variant of the same action: fires with every selected
   * row so one payload's `ordenes[]` can cover them all. */
  onGenerateDispatchNoticeBulk?: (orders: DispatchOrder[]) => void
  /** Whether a detail view is currently open, so the toolbar can hide and
   * the row selection can clear while it's up. */
  onGenerateBarCode?: (order: DispatchOrder) => void
  detailOpen?: boolean
}

const EMPTY_SELECTION: GridRowSelectionModel = {
  type: 'include',
  ids: new Set(),
}

/** How many rows the current selection model covers. */
const selectionCount = (model: GridRowSelectionModel, total: number): number =>
  model.type === 'include' ? model.ids.size : total - model.ids.size

/** Loaded rows the selection model covers. With server pagination only the
 * current page is loaded, so selections on other pages can't be resolved. */
const selectedRows = (
  model: GridRowSelectionModel,
  rows: DispatchOrder[],
): DispatchOrder[] =>
  rows.filter((row) =>
    model.type === 'include' ? model.ids.has(row.id) : !model.ids.has(row.id),
  )

const DispatchOrdersTable = ({
  rows,
  loading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onViewDetail,
  onGenerateDispatchNotice,
  onGenerateDispatchNoticeBulk,
  onGenerateBarCode,
  detailOpen = false,
}: DispatchOrdersTableProps) => {
  const [selection, setSelection] =
    useState<GridRowSelectionModel>(EMPTY_SELECTION)

  const columns = useDispatchOrdersColumns(
    onViewDetail,
    onGenerateDispatchNotice,
    onGenerateBarCode,
  )

  const selected = selectionCount(selection, rowCount)

  const clearSelection = () => setSelection(EMPTY_SELECTION)

  // Opening a detail view shouldn't leave the selection toolbar floating
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
            key: 'dispatch',
            label: 'Generar aviso de despacho',
            icon: <LocalShippingOutlinedIcon fontSize="small" />,
            onClick: () =>
              onGenerateDispatchNoticeBulk?.(selectedRows(selection, rows)),
          },
        ]}
      />
    </>
  )
}

export default DispatchOrdersTable
