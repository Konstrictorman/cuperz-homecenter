import Link from '@mui/material/Link'
import { DataGrid } from '@mui/x-data-grid'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import './PurchaseOrdersTable.css'

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
  const columns: GridColDef<PurchaseOrder>[] = [
    {
      field: 'ordenCompra',
      headerName: 'ORDEN COMPRA',
      flex: 1,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'cliente',
      headerName: 'CLIENTE',
      flex: 1.5,
      minWidth: 160,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'ciudadEntrega',
      headerName: 'CIUDAD ENTREGA',
      flex: 1,
      minWidth: 140,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'tiendas',
      headerName: 'TIENDA(S)',
      type: 'number',
      width: 110,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'cantidadTotal',
      headerName: 'CANT. TOTAL',
      type: 'number',
      width: 120,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'estado',
      headerName: 'ESTADO',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams<PurchaseOrder>) => (
        <StatusBadge
          label={params.row.estadoLabel}
          tone={params.row.estadoTone}
        />
      ),
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'detalle',
      headerName: '',
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<PurchaseOrder>) =>
        onViewDetail ? (
          <Link
            component="button"
            type="button"
            onClick={() => onViewDetail(params.row)}
          >
            Ver detalle
          </Link>
        ) : (
          'Ver detalle'
        ),
      headerAlign: 'center',
      align: 'center',
    },
  ]

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
