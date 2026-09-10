import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { useQuery } from '@tanstack/react-query'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import Modal from '#/components/modal/Modal'
import DataTable from '#/components/dataTable/DataTable'
import { purchaseOrderDetailQueryOptions } from '#/api/purchase-orders'
import type { PurchaseOrder } from './PurchaseOrdersTable'
import { ORDER_LINE_STATUS_UI } from './orderPresentation'
import './PurchaseOrderDetailModal.css'
import Typography from '@mui/material/Typography'

interface PurchaseOrderDetailModalProps {
  order: PurchaseOrder | null
  open: boolean
  onClose: () => void
}

interface OrderLineRow {
  id: string
  sku: string
  producto: string
  tienda: string
  cantidadSolicitada: number
  cantidadCancelada: number
  estadoLineaTone: StatusBadgeTone
  estadoLineaLabel: string
}

const lineColumns: GridColDef<OrderLineRow>[] = [
  { field: 'sku', headerName: 'SKU', flex: 1, minWidth: 100 },
  { field: 'producto', headerName: 'Producto', flex: 2, minWidth: 200 },
  { field: 'tienda', headerName: 'Tienda', flex: 1, minWidth: 140 },
  {
    field: 'cantidadSolicitada',
    headerName: 'Cant. solicitada',
    type: 'number',
    width: 140,
    headerAlign: 'center',
    align: 'center',
  },
  {
    field: 'cantidadCancelada',
    headerName: 'Cant. cancelada',
    type: 'number',
    width: 140,
    headerAlign: 'center',
    align: 'center',
  },
  {
    field: 'estadoLinea',
    headerName: 'Estado línea',
    width: 160,
    sortable: false,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params: GridRenderCellParams<OrderLineRow>) => (
      <StatusBadge
        label={params.row.estadoLineaLabel}
        tone={params.row.estadoLineaTone}
      />
    ),
  },
]

const PurchaseOrderDetailModal = ({
  order,
  open,
  onClose,
}: PurchaseOrderDetailModalProps) => {
  // Hook runs every render; `enabled` gates the actual request.
  const { data: detail, isPending } = useQuery({
    ...purchaseOrderDetailQueryOptions(order?.ordenCompra ?? ''),
    enabled: open && order != null,
  })

  if (!order) return null

  // The API nests lines under stores → flatten into one grid.
  const lineas: OrderLineRow[] = (detail?.tiendas ?? []).flatMap((tienda) =>
    tienda.productos.map((producto) => {
      const ui = ORDER_LINE_STATUS_UI[producto.estadoLinea]
      return {
        id: `${tienda.eanTienda}-${producto.eanSku}`,
        sku: producto.eanSku,
        producto: producto.descripcion,
        tienda: tienda.eanTienda,
        cantidadSolicitada: producto.cantidadSolicitada,
        cantidadCancelada: producto.cantidadCancelada,
        estadoLineaTone: ui.tone,
        estadoLineaLabel: ui.label,
      }
    }),
  )

  return (
    <Modal
      title={`Detalle OC ${order.ordenCompra}`}
      onOpen={open}
      onClose={onClose}
    >
      <div className="purchase-order-detail-modal__summary">
        <div>
          <div className="purchase-order-detail-modal__label">
            <Typography>EAN punto de entrega</Typography>
          </div>
          <Typography>{detail?.eanPuntoEntrega ?? '—'}</Typography>
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">
            <Typography>Estado OC</Typography>
          </div>
          <StatusBadge label={order.estadoLabel} tone={order.estadoTone} />
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">
            <Typography>Cliente / cadena</Typography>
          </div>
          <Typography>{order.cliente}</Typography>
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">
            <Typography>Dirección de entrega</Typography>
          </div>
          <Typography>{detail?.direccionEntrega ?? '—'}</Typography>
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">
            <Typography>Código sesión recibo</Typography>
          </div>
          <Typography>{detail?.codigoSesionRecibo ?? '—'}</Typography>
        </div>
      </div>

      <div className="purchase-order-detail-modal__lines">
        <DataTable
          rows={lineas}
          columns={lineColumns}
          loading={isPending}
          getRowId={(row) => row.id}
          hideFooter
          disableRowSelectionOnClick
          autoHeight
        />
      </div>
    </Modal>
  )
}

export default PurchaseOrderDetailModal
