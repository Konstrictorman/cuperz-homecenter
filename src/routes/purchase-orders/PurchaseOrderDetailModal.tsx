import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import Modal from '#/components/modal/Modal'
import type { PurchaseOrder } from './PurchaseOrdersTable'
import { getPurchaseOrderDetail } from './MOCK_PURCHASE_ORDER_DETAILS'
import type { PurchaseOrderLine } from './MOCK_PURCHASE_ORDER_DETAILS'
import './PurchaseOrderDetailModal.css'
import DataTable from '#/components/dataTable/DataTable'

interface PurchaseOrderDetailModalProps {
  order: PurchaseOrder | null
  open: boolean
  onClose: () => void
}

const lineColumns: GridColDef<PurchaseOrderLine>[] = [
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
    renderCell: (params: GridRenderCellParams<PurchaseOrderLine>) => (
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
  if (!order) return null

  const detail = getPurchaseOrderDetail(order.id)

  return (
    <Modal
      title={`Detalle OC ${order.ordenCompra}`}
      onOpen={open}
      onClose={onClose}
    >
      <div className="purchase-order-detail-modal__summary grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        <div>
          <div className="purchase-order-detail-modal__label">
            EAN punto de entrega
          </div>
          <div>{detail?.eanPuntoEntrega ?? '—'}</div>
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">Estado OC</div>
          <StatusBadge label={order.estadoLabel} tone={order.estadoTone} />
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">
            Cliente / cadena
          </div>
          <div>{order.cliente}</div>
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">
            Transportadora
          </div>
          <div>{detail?.transportadora ?? '—'}</div>
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">
            Dirección de entrega
          </div>
          <div>{detail?.direccionEntrega ?? '—'}</div>
        </div>
        <div>
          <div className="purchase-order-detail-modal__label">
            Código sesión recibo
          </div>
          <div>{detail?.codigoSesionRecibo ?? '—'}</div>
        </div>
      </div>

      <div className="purchase-order-detail-modal__lines">
        <DataTable
          rows={detail?.lineas ?? []}
          columns={lineColumns}
          getRowId={(row) => row.sku}
          hideFooter
          disableRowSelectionOnClick
          autoHeight
        />
      </div>
    </Modal>
  )
}

export default PurchaseOrderDetailModal
