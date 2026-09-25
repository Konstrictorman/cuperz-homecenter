import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { useForm } from '@tanstack/react-form'
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'
import Button from '#/components/button/Button'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import './OrdersFilterBar.css'

export type OrdersFilterStatus = StatusBadgeTone | 'all'

export interface OrdersFilterValues {
  ordenCompra: string
  estado: OrdersFilterStatus
  fechaTransmisionDesde: string
  fechaTransmisionHasta: string
  /** Unchecked (default): only orders from the last 3 months. Checked:
   *  the full archive, with no age restriction. */
  incluirHistorial: boolean
}

export const DEFAULT_ORDERS_FILTER_VALUES: OrdersFilterValues = {
  ordenCompra: '',
  estado: 'all',
  fechaTransmisionDesde: '',
  fechaTransmisionHasta: '',
  incluirHistorial: false,
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
      className="orders-filter-bar"
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
            className="orders-filter-bar__field"
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
            className="orders-filter-bar__field"
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

      <form.Field name="fechaTransmisionDesde">
        {(field) => (
          <TextField
            label="Fecha desde"
            type="date"
            size="small"
            className="orders-filter-bar__field orders-filter-bar__field--narrow"
            slotProps={{ inputLabel: { shrink: true } }}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field name="fechaTransmisionHasta">
        {(field) => (
          <TextField
            label="Fecha hasta"
            type="date"
            size="small"
            className="orders-filter-bar__field orders-filter-bar__field--narrow"
            slotProps={{ inputLabel: { shrink: true } }}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field name="incluirHistorial">
        {(field) => (
          <FormControlLabel
            className="orders-filter-bar__field orders-filter-bar__checkbox"
            control={
              <Checkbox
                size="small"
                checked={field.state.value}
                onChange={(event) => field.handleChange(event.target.checked)}
                onBlur={field.handleBlur}
              />
            }
            label="Incluir archivo"
            title="Sin marcar: solo órdenes de los últimos 3 meses. Marcada: todas, sin importar su antigüedad."
          />
        )}
      </form.Field>
      <div className="orders-filter-bar__actions">
        <Button
          type="submit"
          variant="contained"
          endIcon={<FilterAltIcon />}
          className="orders-filter-bar__action"
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
              className="orders-filter-bar__action"
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
      </div>
    </form>
  )
}

export default OrdersFilterBar
