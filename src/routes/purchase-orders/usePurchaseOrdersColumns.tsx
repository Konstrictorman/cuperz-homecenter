import { useMemo } from 'react'
import Link from '@mui/material/Link'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import {
  GridActionsCellItem,
  type GridColDef,
  type GridRenderCellParams,
} from '@mui/x-data-grid'
import type { PurchaseOrder } from './PurchaseOrdersTable'
import VisibilityIcon from '@mui/icons-material/Visibility'

export const usePurchaseOrdersColumns = (
  onViewDetail?: (order: PurchaseOrder) => void,
): GridColDef<PurchaseOrder>[] =>
  useMemo(
    () => [
      {
        field: 'ordenCompra',
        headerName: 'Orden Compra',
        flex: 1,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'cliente',
        headerName: 'Cliente',
        flex: 1.5,
        minWidth: 160,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'ciudadEntrega',
        headerName: 'Ciudad Entrega',
        flex: 1,
        minWidth: 140,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'tiendas',
        headerName: 'Tienda(S)',
        type: 'number',
        width: 110,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'cantidadTotal',
        headerName: 'Cant. Total',
        type: 'number',
        width: 120,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'estado',
        headerName: 'Estado',
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
        headerName: 'Acción',
        width: 110,
        sortable: false,
        filterable: false,
        type: 'actions',
        getActions: (params) => [
          <GridActionsCellItem
            icon={<VisibilityIcon />}
            label="Ver detalle"
            onClick={() => onViewDetail?.(params.row)}
          />,
        ],
        // renderCell: (params: GridRenderCellParams<PurchaseOrder>) =>
        //   onViewDetail ? (
        //     <Link
        //       component="button"
        //       type="button"
        //       onClick={() => onViewDetail(params.row)}
        //     >
        //       Ver detalle
        //     </Link>
        //   ) : (
        //     <VisibilityIcon />
        //   ),
        headerAlign: 'center',
        align: 'center',
      },
    ],
    [onViewDetail],
  )
