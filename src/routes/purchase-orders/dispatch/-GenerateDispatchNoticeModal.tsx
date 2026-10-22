import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SendIcon from '@mui/icons-material/Send'
import { useQuery } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import Modal from '#/components/modal/Modal'
import Button from '#/components/button/Button'
import { formatDate, todayIsoDate } from '#/common/util'
import { purchaseOrderDetailQueryOptions } from '#/api/purchase-orders'
import type { DispatchOrder } from './-DispatchOrdersTable'
import './GenerateLabelsModal.css'

/** Allowed `YYYY-MM-DD` range for the real dispatch date; `undefined` leaves
 *  that side open. */
interface DispatchWindow {
  min?: string
  max?: string
}

/** The order's delivery window (`fechaMinEntrega`/`fechaMaxEntrega`, naive
 *  `YYYY-MM-DDT00:00:00`), never starting before today. */
const toDispatchWindow = (
  fechaMinEntrega: string | null,
  fechaMaxEntrega: string | null,
): DispatchWindow => {
  const today = todayIsoDate()
  const min = fechaMinEntrega?.slice(0, 10)
  return {
    min: min && min > today ? min : today,
    max: fechaMaxEntrega?.slice(0, 10) || undefined,
  }
}

// `YYYY-MM-DD` strings compare correctly as plain strings.
const validateFechaRealDespacho = (
  value: string,
  dispatchWindow: DispatchWindow,
) => {
  if (!value) return 'Ingrese la fecha real de despacho'
  if (
    dispatchWindow.min &&
    dispatchWindow.max &&
    dispatchWindow.min > dispatchWindow.max
  ) {
    return `La fecha máxima de despacho (${formatDate(dispatchWindow.max)}) ya pasó`
  }
  if (dispatchWindow.min && value < dispatchWindow.min) {
    return `La fecha no puede ser anterior a ${formatDate(dispatchWindow.min)}`
  }
  if (dispatchWindow.max && value > dispatchWindow.max) {
    return `La fecha no puede ser posterior a ${formatDate(dispatchWindow.max)}`
  }
  return undefined
}

/** The order's own date when it still fits the window, otherwise today
 *  clamped into it. */
const defaultFechaRealDespacho = (
  order: DispatchOrder,
  dispatchWindow: DispatchWindow,
) => {
  if (
    order.fechaRealDespacho &&
    !validateFechaRealDespacho(order.fechaRealDespacho, dispatchWindow)
  ) {
    return order.fechaRealDespacho
  }
  const today = todayIsoDate()
  if (dispatchWindow.min && today < dispatchWindow.min)
    return dispatchWindow.min
  return today
}

interface GenerateDispatchNoticeModalProps {
  /** `null` keeps the modal closed. */
  order: DispatchOrder | null
  onClose: () => void
  /** Fired with the validated `YYYY-MM-DD` date; the modal closes right
   *  after — the caller owns the request and its feedback. */
  onSubmit: (order: DispatchOrder, fechaRealDespacho: string) => void
}

const GenerateDispatchNoticeModal = ({
  order,
  onClose,
  onSubmit,
}: GenerateDispatchNoticeModalProps) => {
  // The dispatch preview doesn't carry the delivery window — the PO detail
  // does. Hook runs every render; `enabled` gates the actual request.
  const {
    data: detail,
    isPending,
    isError,
  } = useQuery({
    ...purchaseOrderDetailQueryOptions(order?.ordenCompra ?? ''),
    enabled: order != null,
  })

  const renderBody = () => {
    if (!order) return null
    if (isPending) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
          <CircularProgress size={28} />
        </Box>
      )
    }
    if (isError) {
      return (
        <div className="generate-labels-modal">
          <Typography color="error">
            No se pudieron consultar las fechas mínima y máxima de despacho de
            la orden. Intente de nuevo más tarde.
          </Typography>
          <div className="generate-labels-modal__actions">
            <Button color="neutral" variant="outlined" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )
    }
    return (
      // Keyed so every order starts from a fresh form and its own default.
      <DispatchDateForm
        key={order.ordenCompra}
        order={order}
        dispatchWindow={toDispatchWindow(
          detail.cabecera.fechaMinEntrega,
          detail.cabecera.fechaMaxEntrega,
        )}
        onCancel={onClose}
        onSubmit={(fechaRealDespacho) => {
          onSubmit(order, fechaRealDespacho)
          onClose()
        }}
      />
    )
  }

  return (
    <Modal
      title={`Generar aviso de despacho — Orden ${order?.ordenCompra ?? ''}`}
      onOpen={order !== null}
      onClose={onClose}
      maxWidth="xs"
    >
      {renderBody()}
    </Modal>
  )
}

interface DispatchDateFormProps {
  order: DispatchOrder
  dispatchWindow: DispatchWindow
  onCancel: () => void
  onSubmit: (fechaRealDespacho: string) => void
}

const DispatchDateForm = ({
  order,
  dispatchWindow,
  onCancel,
  onSubmit,
}: DispatchDateFormProps) => {
  const form = useForm({
    defaultValues: {
      fechaRealDespacho: defaultFechaRealDespacho(order, dispatchWindow),
    },
    onSubmit: ({ value }) => onSubmit(value.fechaRealDespacho),
  })

  return (
    <form
      className="generate-labels-modal"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="fechaRealDespacho"
        validators={{
          onMount: ({ value }) =>
            validateFechaRealDespacho(value, dispatchWindow),
          onChange: ({ value }) =>
            validateFechaRealDespacho(value, dispatchWindow),
          onSubmit: ({ value }) =>
            validateFechaRealDespacho(value, dispatchWindow),
        }}
      >
        {(field) => (
          <TextField
            label="Fecha real de despacho"
            type="date"
            size="small"
            autoFocus
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: dispatchWindow.min, max: dispatchWindow.max },
            }}
            error={field.state.meta.errors.length > 0}
            helperText={
              field.state.meta.errors[0] ??
              (dispatchWindow.max
                ? `Entre ${formatDate(dispatchWindow.min)} y ${formatDate(dispatchWindow.max)}`
                : `Desde ${formatDate(dispatchWindow.min)}`)
            }
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="generate-labels-modal__actions">
        <Button color="neutral" variant="outlined" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SendIcon />}>
          Enviar
        </Button>
      </div>
    </form>
  )
}

export default GenerateDispatchNoticeModal
