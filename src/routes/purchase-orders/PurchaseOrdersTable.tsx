import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import { useState } from 'react'
import type { GridRowSelectionModel } from '@mui/x-data-grid'
import DataTable from '#/components/dataTable/DataTable'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import ToolBar from '#/components/toolBar/ToolBar'
import { usePurchaseOrdersColumns } from './usePurchaseOrdersColumns'

export interface PurchaseOrder {
  id: string
  ordenCompra: string
  cliente: string
  ciudadEntrega: string
  tiendas: number
  cantidadTotal: number
  estadoTone: StatusBadgeTone
  estadoLabel: string
  fecha: string
}

interface PurchaseOrdersTableProps {
  rows: PurchaseOrder[]
  loading?: boolean
  onViewDetail?: (order: PurchaseOrder) => void
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
}: PurchaseOrdersTableProps) => {
  const columns = usePurchaseOrdersColumns(onViewDetail)
  const [selection, setSelection] =
    useState<GridRowSelectionModel>(EMPTY_SELECTION)

  const selected = selectionCount(selection, rows.length)

  const clearSelection = () => setSelection(EMPTY_SELECTION)

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
        open={selected > 0}
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
            label: 'Reintentar',
            icon: <AutorenewOutlinedIcon fontSize="small" />,
            onClick: () => console.log('Reintentar', selection),
          },
        ]}
      />
    </>
  )
}

export default PurchaseOrdersTable
