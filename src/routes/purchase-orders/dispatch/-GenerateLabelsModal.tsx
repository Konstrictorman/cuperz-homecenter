import TextField from '@mui/material/TextField'
import PrintIcon from '@mui/icons-material/Print'
import { useForm } from '@tanstack/react-form'
import Modal from '#/components/modal/Modal'
import Button from '#/components/button/Button'
import type { DispatchOrder } from './-DispatchOrdersTable'
import './GenerateLabelsModal.css'

const DEFAULT_NUM_TAGS = 1

const validateNumTags = (value: number) =>
  Number.isInteger(value) && value >= 1
    ? undefined
    : 'Ingrese un número entero mayor o igual a 1'

interface GenerateLabelsModalProps {
  /** `null` keeps the modal closed. */
  order: DispatchOrder | null
  onClose: () => void
  /** Fired with the validated copy count; the modal closes right after —
   *  the caller owns the request and its feedback. */
  onSubmit: (order: DispatchOrder, numTags: number) => void
}

const GenerateLabelsModal = ({
  order,
  onClose,
  onSubmit,
}: GenerateLabelsModalProps) => {
  const form = useForm({
    defaultValues: { numTags: DEFAULT_NUM_TAGS },
    onSubmit: ({ value }) => {
      if (!order) return
      onSubmit(order, value.numTags)
      handleClose()
    },
  })

  // Reset on close so the next order starts again from the default count.
  function handleClose() {
    form.reset()
    onClose()
  }

  return (
    <Modal
      title={`Generar código de barras — Orden ${order?.ordenCompra ?? ''}`}
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
          name="numTags"
          validators={{
            onChange: ({ value }) => validateNumTags(value),
            onSubmit: ({ value }) => validateNumTags(value),
          }}
        >
          {(field) => (
            <TextField
              label="¿Cuántas impresiones desea hacer?"
              type="number"
              size="small"
              autoFocus
              fullWidth
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              error={field.state.meta.errors.length > 0}
              helperText={field.state.meta.errors[0]}
              value={Number.isNaN(field.state.value) ? '' : field.state.value}
              // a cleared input becomes NaN so validation flags it
              onChange={(event) =>
                field.handleChange(
                  event.target.value === '' ? NaN : Number(event.target.value),
                )
              }
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>

        <div className="generate-labels-modal__actions">
          <Button color="neutral" variant="outlined" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" startIcon={<PrintIcon />}>
            Generar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default GenerateLabelsModal
