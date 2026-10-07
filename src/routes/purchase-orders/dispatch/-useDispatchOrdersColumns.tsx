import { useMemo } from 'react'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import { GridActionsCellItem } from '@mui/x-data-grid'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import QrCodeIcon from '@mui/icons-material/QrCode'
import type { DispatchOrder } from './-DispatchOrdersTable'
import { formatDate } from '#/common/util'

export const useDispatchOrdersColumns = (
  onViewDetail?: (order: DispatchOrder) => void,
  onGenerateDispatchNotice?: (order: DispatchOrder) => void,
  onGenerateBarCode?: (order: DispatchOrder) => void,
): GridColDef<DispatchOrder>[] =>
  useMemo(
    () => [
      {
        field: 'numPedido',
        headerName: 'Número de pedido',
        flex: 1,
        minWidth: 150,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'ordenCompra',
        headerName: 'Orden Compra',
        flex: 1,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
      },

      {
        field: 'eanPuntoEntrega',
        headerName: 'EAN punto entrega',
        flex: 1,
        minWidth: 150,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'fechaDespacho',
        headerName: 'Fecha despacho',
        flex: 1,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value: DispatchOrder['fechaDespacho']) =>
          formatDate(value),
      },
      {
        field: 'estado',
        headerName: 'Estado',
        width: 180,
        sortable: false,
        renderCell: (params: GridRenderCellParams<DispatchOrder>) => (
          <StatusBadge
            label={params.row.estadoLabel}
            tone={params.row.estadoTone}
          />
        ),
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'acciones',
        headerName: 'Acciones',
        flex: 0.6,
        sortable: false,
        filterable: false,
        type: 'actions',
        getActions: (params) => [
          <GridActionsCellItem
            icon={<VisibilityIcon />}
            label="Ver detalle"
            onClick={() => onViewDetail?.(params.row)}
          />,
          <GridActionsCellItem
            icon={<LocalShippingOutlinedIcon />}
            label="Generar aviso de despacho"
            onClick={() => onGenerateDispatchNotice?.(params.row)}
            disabled={params.row.estadoTone !== 'pending'}
          />,
          <GridActionsCellItem
            icon={<QrCodeIcon />}
            label="Generar código de barras"
            onClick={() => onGenerateBarCode?.(params.row)}
            disabled={params.row.estadoTone !== 'dispatched'}
          />,
        ],
        headerAlign: 'center',
        align: 'center',
      },
    ],
    [onViewDetail, onGenerateDispatchNotice, onGenerateBarCode],
  )
