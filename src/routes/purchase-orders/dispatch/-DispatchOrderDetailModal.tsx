import Typography from '@mui/material/Typography'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import Modal from '#/components/modal/Modal'
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
  if (!order) return null

  return (
    <Modal
      title={`Detalle despacho — Orden ${order.ordenCompra}`}
      onOpen={open}
      onClose={onClose}
      maxWidth="xl"
    >
      <div className="dispatch-order-detail-modal__summary">
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
          <Typography>{formatDate(order.fechaRealDespacho) || '—'}</Typography>
        </div>
        <div>
          <Typography className="dispatch-order-detail-modal__label">
            Cantidad total
          </Typography>
          <Typography>{order.cantidadTotal}</Typography>
        </div>
        <div>
          <Typography className="dispatch-order-detail-modal__label">
            Valor total
          </Typography>
          <Typography>{`$${Math.round(order.valorTotal).toLocaleString('es-CO')}`}</Typography>
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
          ordenCompra={order.ordenCompra}
          tiendas={order.source.tiendas}
        />
      </div>
    </Modal>
  )
}

export default DispatchOrderDetailModal
