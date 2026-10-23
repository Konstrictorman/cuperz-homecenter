import Button from '#/components/button/Button'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import TextField from '@mui/material/TextField'
import './RetryOrdersPage.css'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import ClearIcon from '@mui/icons-material/Clear'
import ReplayIcon from '@mui/icons-material/Replay'
import {
  reprocessOrderErrorMessage,
  useReprocessOrder,
} from '#/api/purchase-orders'
import { useFeedback } from '#/contexts/FeedbackContext'

function validateOrderNumber(value: string): string | undefined {
  return value.trim() ? undefined : 'Ingrese el ID de la orden de compra.'
}

const RetryOrdersPage = () => {
  const feedback = useFeedback()
  const reprocess = useReprocessOrder()

  const form = useForm({
    defaultValues: {
      retryOrders: '',
    },
    onSubmit: async ({ value, formApi }) => {
      const ordenCompra = value.retryOrders.trim()
      await feedback.run(
        async () => {
          try {
            await reprocess.mutateAsync(ordenCompra)
            formApi.reset()
          } catch (error) {
            // The backend sends only an error code — map it to wording here.
            const message = reprocessOrderErrorMessage(error, ordenCompra)
            throw message ? new Error(message) : error
          }
        },
        {
          success: `La orden de compra ${ordenCompra} se reinyectó correctamente.`,
          error: `No se pudo reinyectar la orden de compra ${ordenCompra}.`,
        },
      )
    },
  })

  return (
    <div className="retry-orders">
      <form
        className="retry-orders-form"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field
          name="retryOrders"
          validators={{ onSubmit: ({ value }) => validateOrderNumber(value) }}
        >
          {(field) => (
            <TextField
              className="retry-orders__field"
              label="ID de la orden de compra"
              error={field.state.meta.errors.length > 0}
              helperText={field.state.meta.errors[0]}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              size="small"
              placeholder="Ingrese el ID de la orden de compra a reinyectar"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => field.handleChange('')}
                        edge="end"
                        className="retry-orders__clear-button"
                      >
                        {field.state.value ? <ClearIcon /> : null}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              variant="contained"
              endIcon={<ReplayIcon />}
              disabled={isSubmitting}
            >
              Reinyectar
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  )
}

export const Route = createFileRoute('/purchase-orders/retry/')({
  staticData: {
    crumb: 'Reinyectar OC',
  },
  component: RetryOrdersPage,
})
