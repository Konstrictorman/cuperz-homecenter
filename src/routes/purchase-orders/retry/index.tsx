import Button from '#/components/button/Button'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import TextField from '@mui/material/TextField'
import './RetryOrdersPage.css'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import ClearIcon from '@mui/icons-material/Clear'
import ReplayIcon from '@mui/icons-material/Replay'

const RetryOrdersPage = () => {
  const form = useForm({
    defaultValues: {
      retryOrders: '',
    },
    onSubmit: async (values) => {
      console.log('Reinyectar ordenes de compra:', values.retryOrders)
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
        <form.Field name="retryOrders">
          {(field) => (
            <TextField
              className="retry-orders__field"
              label="ID de la orden de compra"
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
                        className="filter-bar__clear-button"
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
        <Button type="submit" variant="contained" endIcon={<ReplayIcon />}>
          Reinyectar
        </Button>
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
