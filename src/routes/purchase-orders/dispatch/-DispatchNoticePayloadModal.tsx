import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Modal from '#/components/modal/Modal'
import Button from '#/components/button/Button'
import { purchaseOrderDispatchDetailQueryOptions } from '#/api/purchase-order-dispatch'
import { toDispatchNoticePayload } from './-dispatchNoticePayload'
import './DispatchNoticePayloadModal.css'

interface DispatchNoticePayloadModalProps {
  /** One `numPedido` per order to include in the payload's `ordenes[]` —
   *  a single entry for the row-level action, several for the bulk one. */
  numPedidos: Array<string>
  open: boolean
  onClose: () => void
}

const DispatchNoticePayloadModal = ({
  numPedidos,
  open,
  onClose,
}: DispatchNoticePayloadModalProps) => {
  const [copied, setCopied] = useState(false)

  const queries = useQueries({
    queries: numPedidos.map((numPedido) => ({
      ...purchaseOrderDispatchDetailQueryOptions(numPedido),
      enabled: open && numPedido.length > 0,
    })),
  })

  if (numPedidos.length === 0) return null

  const isPending = queries.some((query) => query.isPending)
  const isError = queries.some((query) => query.isError)
  const details = queries
    .map((query) => query.data)
    .filter((detail): detail is NonNullable<typeof detail> => detail != null)

  const json =
    !isPending && !isError
      ? JSON.stringify(toDispatchNoticePayload(details), null, 2)
      : ''

  const handleCopy = () => {
    void navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const title =
    numPedidos.length === 1
      ? `Payload aviso de despacho — Pedido ${numPedidos[0]}`
      : `Payload aviso de despacho — ${numPedidos.length} pedidos`

  return (
    <Modal title={title} onOpen={open} onClose={onClose}>
      {isPending ? (
        <Box className="dispatch-notice-payload-modal__status">
          <CircularProgress size={28} />
        </Box>
      ) : isError ? (
        <Box className="dispatch-notice-payload-modal__status">
          <Typography>
            No se pudo generar el payload para{' '}
            {numPedidos.length === 1 ? 'el pedido' : 'los pedidos'}{' '}
            seleccionado(s).
          </Typography>
        </Box>
      ) : (
        <>
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
        </>
      )}
    </Modal>
  )
}

export default DispatchNoticePayloadModal
