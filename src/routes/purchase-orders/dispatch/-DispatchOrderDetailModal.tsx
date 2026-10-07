import { useQuery } from '@tanstack/react-query'
import Typography from '@mui/material/Typography'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import Modal from '#/components/modal/Modal'
import { purchaseOrderDispatchDetailQueryOptions } from '#/api/purchase-order-dispatch'
import { formatDate } from '#/common/util'
import type { DispatchOrder } from './-DispatchOrdersTable'
import DispatchOrderProductsTable from './-DispatchOrderProductsTable'
import './DispatchOrderDetailModal.css'

interface DispatchOrderDetailModalProps {
  order: DispatchOrder | null
  open: boolean
  onClose: () => void
}

const DispatchOrderDetailModal = ({
  order,
  open,
  onClose,
}: DispatchOrderDetailModalProps) => {
  // Hook runs every render; `enabled` gates the actual request.
  const { data: detail, isPending } = useQuery({
    ...purchaseOrderDispatchDetailQueryOptions(order?.numPedido ?? ''),
    enabled: open && order != null,
  })

  if (!order) return null

  return (
    <Modal
      title={`Detalle despacho — Pedido ${order.numPedido} — Orden ${order.ordenCompra}`}
      onOpen={open}
      onClose={onClose}
    >
      <div className="dispatch-order-detail-modal__summary">
        <div>
          <Typography className="dispatch-order-detail-modal__label">
            Orden de compra
          </Typography>
          <Typography>{order.ordenCompra}</Typography>
        </div>
        <div>
          <Typography className="dispatch-order-detail-modal__label">
            EAN punto de entrega
          </Typography>
          <Typography>{order.eanPuntoEntrega}</Typography>
        </div>
        <div>
          <Typography className="dispatch-order-detail-modal__label">
            Fecha de despacho
          </Typography>
          <Typography>{formatDate(order.fechaDespacho) || '—'}</Typography>
        </div>
        <div>
          <Typography className="dispatch-order-detail-modal__label">
            Estado
          </Typography>
          <StatusBadge label={order.estadoLabel} tone={order.estadoTone} />
        </div>
      </div>

      <div className="dispatch-order-detail-modal__lines">
        <DispatchOrderProductsTable
          numPedido={order.numPedido}
          tiendas={detail?.tiendas ?? []}
          loading={isPending}
        />
      </div>
    </Modal>
  )
}

export default DispatchOrderDetailModal
