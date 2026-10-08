import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import { useEffect, useState } from 'react'
import type { GridRowSelectionModel } from '@mui/x-data-grid'
import DataTable from '#/components/dataTable/DataTable'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import ToolBar from '#/components/toolBar/ToolBar'
import { useDispatchOrdersColumns } from './-useDispatchOrdersColumns'

export interface DispatchOrder {
  id: string
  ordenCompra: string
  numPedido: string
  eanPuntoEntrega: string
  fechaDespacho: string
  estadoTone: StatusBadgeTone
  estadoLabel: string
}

interface DispatchOrdersTableProps {
  rows: DispatchOrder[]
  loading?: boolean
  onViewDetail?: (order: DispatchOrder) => void
  onGenerateDispatchNotice?: (order: DispatchOrder) => void
  /** Bulk/toolbar variant of the same action: fires with every selected
   * row's `numPedido` so one payload's `ordenes[]` can cover them all. */
  onGenerateDispatchNoticeBulk?: (numPedidos: string[]) => void
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

/** Row ids (== `numPedido`, see `toDispatchOrderRow`) the selection model
 * covers, resolving the `exclude` case against the currently loaded rows. */
const selectedIds = (
  model: GridRowSelectionModel,
  rows: DispatchOrder[],
): string[] =>
  model.type === 'include'
    ? Array.from(model.ids, String)
    : rows.map((row) => row.id).filter((id) => !model.ids.has(id))

const DispatchOrdersTable = ({
  rows,
  loading,
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

  const selected = selectionCount(selection, rows.length)

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
              onGenerateDispatchNoticeBulk?.(selectedIds(selection, rows)),
          },
        ]}
      />
    </>
  )
}

export default DispatchOrdersTable
