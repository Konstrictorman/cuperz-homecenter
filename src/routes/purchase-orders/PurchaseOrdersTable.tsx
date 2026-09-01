import { DataGrid } from '@mui/x-data-grid'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import './PurchaseOrdersTable.css'
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
  onViewDetail?: (order: PurchaseOrder) => void
}

const PurchaseOrdersTable = ({
  rows,
  onViewDetail,
}: PurchaseOrdersTableProps) => {
  const columns = usePurchaseOrdersColumns(onViewDetail)

  return (
    <div className="purchase-orders-table w-full overflow-x-auto">
      <DataGrid
        rows={rows}
        columns={columns}
        checkboxSelection
        disableRowSelectionOnClick
        autoHeight
        hideFooterSelectedRowCount
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        pageSizeOptions={[10, 25, 50]}
      />
    </div>
  )
}

export default PurchaseOrdersTable
