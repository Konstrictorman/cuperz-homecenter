import { useState } from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Modal from '#/components/modal/Modal'
import Button from '#/components/button/Button'
import { toDispatchNoticePayload } from './-dispatchNoticePayload'
import type { DispatchOrder } from './-DispatchOrdersTable'
import './DispatchNoticePayloadModal.css'

interface DispatchNoticePayloadModalProps {
  /** One entry per order in the payload's `ordenes[]` — a single row for the
   *  row-level action, several for the bulk one. */
  orders: Array<DispatchOrder>
  open: boolean
  onClose: () => void
}

const DispatchNoticePayloadModal = ({
  orders,
  open,
  onClose,
}: DispatchNoticePayloadModalProps) => {
  const [copied, setCopied] = useState(false)

  if (orders.length === 0) return null

  const json = JSON.stringify(
    toDispatchNoticePayload(orders.map((order) => order.source)),
    null,
    2,
  )

  const handleCopy = () => {
    void navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const title =
    orders.length === 1
      ? `Payload aviso de despacho — Orden ${orders[0].ordenCompra}`
      : `Payload aviso de despacho — ${orders.length} órdenes`

  return (
    <Modal title={title} onOpen={open} onClose={onClose}>
      <div className="dispatch-notice-payload-modal__actions">
        <Button
          color="neutral"
          variant="outlined"
          size="small"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={handleCopy}
        >
          {copied ? 'Copiado' : 'Copiar JSON'}
        </Button>
      </div>
      <pre className="dispatch-notice-payload-modal__json">{json}</pre>
    </Modal>
  )
}

export default DispatchNoticePayloadModal
