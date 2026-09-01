import DataTable from '#/components/dataTable/DataTable'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
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

  return <DataTable rows={rows} columns={columns} />
}

export default PurchaseOrdersTable
