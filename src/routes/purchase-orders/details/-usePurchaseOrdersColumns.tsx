import { useMemo } from 'react'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import { GridActionsCellItem } from '@mui/x-data-grid'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import type { PurchaseOrder } from './-PurchaseOrdersTable'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

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
        field: 'fechaTransmision',
        headerName: 'Fecha',
        flex: 1,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value: PurchaseOrder['fechaTransmision']) =>
          value ? value.slice(0, 10) : '',
      },
      {
        field: 'fechaMinEntrega',
        headerName: 'Fecha Min. Entrega',
        flex: 1,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value: PurchaseOrder['fechaMinEntrega']) =>
          value ? value.slice(0, 10) : '',
      },
      {
        field: 'fechaMaxEntrega',
        headerName: 'Fecha Max. Entrega',
        flex: 1,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value: PurchaseOrder['fechaMaxEntrega']) =>
          value ? value.slice(0, 10) : '',
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
        field: 'cantidadTotal',
        headerName: 'Cant. Total',
        type: 'number',
        width: 120,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'costoTotalOc',
        headerName: 'Costo Total',
        type: 'number',
        width: 140,
        headerAlign: 'center',
        align: 'center',
        valueFormatter: (value: PurchaseOrder['costoTotalOc']) =>
          `$${Math.round(value).toLocaleString('en-US')}`,
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
        headerName: 'Acciones',
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
          <GridActionsCellItem
            icon={<DownloadIcon />}
            label="Descargar CSV"
            onClick={() => onViewDetail?.(params.row)}
          />,
          <GridActionsCellItem
            icon={<PictureAsPdfIcon />}
            label="Descargar PDF"
            onClick={() => onViewDetail?.(params.row)}
          />,
        ],
        headerAlign: 'center',
        align: 'center',
      },
    ],
    [onViewDetail],
  )
