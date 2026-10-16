import TextField from '@mui/material/TextField'
import SendIcon from '@mui/icons-material/Send'
import { useForm } from '@tanstack/react-form'
import Modal from '#/components/modal/Modal'
import Button from '#/components/button/Button'
import { todayIsoDate } from '#/common/util'
import type { DispatchOrder } from './-DispatchOrdersTable'
import './GenerateLabelsModal.css'

// `YYYY-MM-DD` strings compare correctly as plain strings.
const validateFechaRealDespacho = (value: string) => {
  if (!value) return 'Ingrese la fecha real de despacho'
  if (value < todayIsoDate()) return 'La fecha no puede ser anterior a hoy'
  return undefined
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
  const form = useForm({
    // An order that already has a date keeps it unless it is now in the past
    // (which would fail validation); otherwise default to today.
    defaultValues: {
      fechaRealDespacho:
        order?.fechaRealDespacho && order.fechaRealDespacho >= todayIsoDate()
          ? order.fechaRealDespacho
          : todayIsoDate(),
    },
    onSubmit: ({ value }) => {
      if (!order) return
      onSubmit(order, value.fechaRealDespacho)
      handleClose()
    },
  })

  // Reset on close so the next order starts again from its own default.
  function handleClose() {
    form.reset()
    onClose()
  }

  return (
    <Modal
      title={`Generar aviso de despacho — Orden ${order?.ordenCompra ?? ''}`}
      onOpen={order !== null}
      onClose={handleClose}
      maxWidth="xs"
    >
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
            onChange: ({ value }) => validateFechaRealDespacho(value),
            onSubmit: ({ value }) => validateFechaRealDespacho(value),
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
                htmlInput: { min: todayIsoDate() },
              }}
              error={field.state.meta.errors.length > 0}
              helperText={field.state.meta.errors[0]}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>

        <div className="generate-labels-modal__actions">
          <Button color="neutral" variant="outlined" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" startIcon={<SendIcon />}>
            Enviar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default GenerateDispatchNoticeModal
