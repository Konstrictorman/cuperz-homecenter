import { useQuery } from '@tanstack/react-query'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import Modal from '#/components/modal/Modal'
import { purchaseOrderDetailQueryOptions } from '#/api/purchase-orders'
import type { PurchaseOrder } from './-PurchaseOrdersTable'
import PurchaseOrderStoresTable from './-PurchaseOrderStoresTable'
import './PurchaseOrderDetailModal.css'
import Typography from '@mui/material/Typography'

interface PurchaseOrderDetailModalProps {
  order: PurchaseOrder | null
  open: boolean
  onClose: () => void
}

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
        <PurchaseOrderStoresTable
          tiendas={detail?.tiendas ?? []}
          loading={isPending}
        />
      </div>
    </Modal>
  )
}

export default PurchaseOrderDetailModal
