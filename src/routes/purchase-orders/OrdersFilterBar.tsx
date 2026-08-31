import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { useForm } from '@tanstack/react-form'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import Button from '#/components/button/Button'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'

export type OrdersFilterStatus = StatusBadgeTone | 'all'

export interface OrdersFilterValues {
  ordenCompra: string
  estado: OrdersFilterStatus
  fechaDesde: string
  fechaHasta: string
}

export const DEFAULT_ORDERS_FILTER_VALUES: OrdersFilterValues = {
  ordenCompra: '',
  estado: 'all',
  fechaDesde: '',
  fechaHasta: '',
}

const STATUS_OPTIONS: Array<{ value: OrdersFilterStatus; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente despacho' },
  { value: 'dispatched', label: 'Despachada' },
  { value: 'error', label: 'Error integración' },
  { value: 'processing', label: 'Procesando' },
]

interface OrdersFilterBarProps {
  onFilter: (values: OrdersFilterValues) => void
}

const OrdersFilterBar = ({ onFilter }: OrdersFilterBarProps) => {
  const form = useForm({
    defaultValues: DEFAULT_ORDERS_FILTER_VALUES,
    onSubmit: async ({ value }) => {
      onFilter(value)
    },
  })

  return (
    <form
      className="flex flex-wrap items-end gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field name="ordenCompra">
        {(field) => (
          <TextField
            label="Orden de compra"
            placeholder="Buscar OC"
            size="small"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field name="estado">
        {(field) => (
          <TextField
            select
            label="Estado"
            size="small"
            className="min-w-48!"
            value={field.state.value}
            onChange={(event) =>
              field.handleChange(event.target.value as OrdersFilterStatus)
            }
            onBlur={field.handleBlur}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </form.Field>

      <form.Field name="fechaDesde">
        {(field) => (
          <TextField
            label="Fecha desde"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field name="fechaHasta">
        {(field) => (
          <TextField
            label="Fecha hasta"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <Button
        type="submit"
        variant="contained"
        endIcon={<FilterAltIcon />}
        className="mt-1"
      >
        Filtrar
      </Button>

      <form.Subscribe
        selector={(state) =>
          Object.keys(DEFAULT_ORDERS_FILTER_VALUES).some(
            (key) =>
              state.values[key as keyof OrdersFilterValues] !==
              DEFAULT_ORDERS_FILTER_VALUES[key as keyof OrdersFilterValues],
          )
        }
      >
        {(isFiltered) => (
          <Button
            type="button"
            variant="outlined"
            endIcon={<FilterAltOffIcon />}
            className="mt-1"
            disabled={!isFiltered}
            onClick={() => {
              form.reset()
              onFilter(DEFAULT_ORDERS_FILTER_VALUES)
            }}
          >
            Limpiar
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

export default OrdersFilterBar
