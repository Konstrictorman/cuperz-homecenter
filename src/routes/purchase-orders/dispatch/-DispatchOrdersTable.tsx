import type { GridPaginationModel } from '@mui/x-data-grid'
import type { DispatchPreviewOrder } from '#/api/types'
import DataTable from '#/components/dataTable/DataTable'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import { useDispatchOrdersColumns } from './-useDispatchOrdersColumns'

export interface DispatchOrder {
  /** == `ordenCompra` — the only per-order key the API returns. */
  id: string
  ordenCompra: string
  numpedido: string
  eanPuntoEntrega: string
  /** `''` while not yet dispatched. */
  fechaRealDespacho: string
  fechaTransmision: string
  cantidadTiendas: number
  cantidadContenedores: number
  cantidadTotal: number
  valorTotal: number
  estadoTone: StatusBadgeTone
  estadoLabel: string
  /** The untouched API order — its Tienda→Contenedor→Producto tree feeds the
   *  detail modal without another request. */
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
  onGenerateBarCode?: (order: DispatchOrder) => void
}

const DispatchOrdersTable = ({
  rows,
  loading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onViewDetail,
  onGenerateDispatchNotice,
  onGenerateBarCode,
}: DispatchOrdersTableProps) => {
  const columns = useDispatchOrdersColumns(
    onViewDetail,
    onGenerateDispatchNotice,
    onGenerateBarCode,
  )

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={loading}
      checkboxSelection={false}
      paginationMode="server"
      rowCount={rowCount}
      paginationModel={paginationModel}
      onPaginationModelChange={onPaginationModelChange}
    />
  )
}

export default DispatchOrdersTable
