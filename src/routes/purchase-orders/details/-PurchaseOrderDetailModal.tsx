import { useQuery } from '@tanstack/react-query'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import Modal from '#/components/modal/Modal'
import { purchaseOrderDetailQueryOptions } from '#/api/purchase-orders'
import type { PurchaseOrder } from './-PurchaseOrdersTable'
import PurchaseOrderStoresTable from './-PurchaseOrderStoresTable'
import './PurchaseOrderDetailModal.css'
import Typography from '@mui/material/Typography'
import { formatDate } from '#/common/util'

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
          <Typography className="purchase-order-detail-modal__label">
            EAN punto de entrega
          </Typography>
          <Typography>{detail?.eanPuntoEntrega ?? '—'}</Typography>
        </div>
        <div>
          <Typography className="purchase-order-detail-modal__label">
            Número de pedido
          </Typography>
          <Typography>{detail?.numPedido ?? '—'}</Typography>
        </div>
        <div>
          <Typography className="purchase-order-detail-modal__label">
            Fecha de pedido
          </Typography>
          <Typography>
            {formatDate(detail?.fechaTransmision ?? undefined)}
          </Typography>
        </div>
        <div>
          <Typography className="purchase-order-detail-modal__label">
            Estado OC
          </Typography>
          <StatusBadge label={order.estadoLabel} tone={order.estadoTone} />
        </div>
        <div>
          <Typography className="purchase-order-detail-modal__label">
            Cantidad Total
          </Typography>
          <Typography>{detail?.cantidadTotalSolicitada ?? '—'}</Typography>
        </div>
        <div>
          <Typography className="purchase-order-detail-modal__label">
            Costo Total
          </Typography>

          <Typography>
            {`$${Math.round(detail?.costoTotalOc ?? 0).toLocaleString('es-CO')}`}
          </Typography>
        </div>
        <div>
          <Typography className="purchase-order-detail-modal__label">
            Cliente / cadena
          </Typography>
          <Typography>{order.cliente}</Typography>
        </div>
        <div>
          <Typography className="purchase-order-detail-modal__label">
            Dirección de entrega
          </Typography>
          <Typography>{detail?.direccionEntrega ?? '—'}</Typography>
        </div>
        <div>
          <Typography className="purchase-order-detail-modal__label">
            Código sesión recibo
          </Typography>
          <Typography>{detail?.codigoSesionRecibo ?? '—'}</Typography>
        </div>
      </div>

      <div className="purchase-order-detail-modal__lines">
        <PurchaseOrderStoresTable
          tiendas={detail?.tiendas ?? []}
          loading={isPending}
          purchaseOrderNumber={order.ordenCompra}
        />
      </div>
    </Modal>
  )
}

export default PurchaseOrderDetailModal
