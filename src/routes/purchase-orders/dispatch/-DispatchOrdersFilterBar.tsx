import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { useForm } from '@tanstack/react-form'
import Button from '#/components/button/Button'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import { validateRangeOrder } from '../-dateRange'
import '../FilterBar.css'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import ClearIcon from '@mui/icons-material/Clear'

/** Mirrors `DispatchPreviewStatus` (`#/api/types`) — the endpoint only
 *  distinguishes ALISTADO/DESPACHADO, unlike the richer `StatusBadgeTone`
 *  union the details-route filter bar uses. */
export type DispatchOrdersFilterStatus =
  'ready' | 'dispatched' | 'all' | 'error' | 'cancelled'

/** `GET /avisos-despacho` filters by order number (`numpedido`), PO number,
 *  estado and a date range (both ends required together). */
export interface DispatchOrdersFilterValues {
  numpedido: string
  ordenCompra: string
  estado: DispatchOrdersFilterStatus
  fechaDesde: string
  fechaHasta: string
}

export const DEFAULT_DISPATCH_ORDERS_FILTER_VALUES: DispatchOrdersFilterValues =
  {
    numpedido: '',
    ordenCompra: '',
    estado: 'all',
    fechaDesde: '',
    fechaHasta: '',
  }

const STATUS_OPTIONS: Array<{
  value: DispatchOrdersFilterStatus
  label: string
}> = [
  { value: 'all', label: 'Todos' },
  { value: 'ready', label: 'Alistada' },
  { value: 'dispatched', label: 'Despachada' },
  { value: 'error', label: 'Error' },
  { value: 'cancelled', label: 'Cancelada' },
]

const INCOMPLETE_RANGE = 'Indique ambas fechas'

/** Shared by both date fields: the backend rejects a half-open range
 *  (`422 RANGO_FECHAS_INCOMPLETO`), so flag whichever end is missing. */
const validateRangeEnd = (value: string, otherEnd: string) =>
  !value && otherEnd ? INCOMPLETE_RANGE : undefined

interface DispatchOrdersFilterBarProps {
  onFilter: (values: DispatchOrdersFilterValues) => void
}

const DispatchOrdersFilterBar = ({
  onFilter,
}: DispatchOrdersFilterBarProps) => {
  const form = useForm({
    defaultValues: DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
    onSubmit: async ({ value }) => {
      onFilter(value)
    },
  })

  return (
    <form
      className="filter-bar"
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
            className="filter-bar__field"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => field.handleChange('')}
                      edge="end"
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

      <form.Field name="numpedido">
        {(field) => (
          <TextField
            label="Número de pedido"
            placeholder="Buscar pedido"
            size="small"
            className="filter-bar__field"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => field.handleChange('')}
                      edge="end"
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

      <form.Field name="estado">
        {(field) => (
          <TextField
            select
            label="Estado"
            size="small"
            className="filter-bar__field"
            value={field.state.value}
            onChange={(event) =>
              field.handleChange(
                event.target.value as DispatchOrdersFilterStatus,
              )
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

      <form.Field
        name="fechaDesde"
        validators={{
          onSubmit: ({ value, fieldApi }) =>
            validateRangeEnd(value, fieldApi.form.getFieldValue('fechaHasta')),
        }}
      >
        {(field) => (
          <TextField
            label="Fecha despacho desde"
            type="date"
            size="small"
            className="filter-bar__field filter-bar__field--narrow"
            slotProps={{ inputLabel: { shrink: true } }}
            error={field.state.meta.errors.length > 0}
            helperText={field.state.meta.errors[0]}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field
        name="fechaHasta"
        validators={{
          onChangeListenTo: ['fechaDesde'],
          onChange: ({ value, fieldApi }) =>
            validateRangeOrder(
              fieldApi.form.getFieldValue('fechaDesde'),
              value,
            ),
          onSubmit: ({ value, fieldApi }) =>
            validateRangeEnd(value, fieldApi.form.getFieldValue('fechaDesde')),
        }}
      >
        {(field) => (
          <TextField
            label="Fecha despacho hasta"
            type="date"
            size="small"
            className="filter-bar__field filter-bar__field--narrow"
            slotProps={{ inputLabel: { shrink: true } }}
            error={field.state.meta.errors.length > 0}
            helperText={field.state.meta.errors[0]}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="filter-bar__actions">
        <Button
          type="submit"
          variant="contained"
          endIcon={<FilterAltIcon />}
          className="filter-bar__action"
        >
          Filtrar
        </Button>

        <form.Subscribe
          selector={(state) =>
            Object.keys(DEFAULT_DISPATCH_ORDERS_FILTER_VALUES).some(
              (key) =>
                state.values[key as keyof DispatchOrdersFilterValues] !==
                DEFAULT_DISPATCH_ORDERS_FILTER_VALUES[
                  key as keyof DispatchOrdersFilterValues
                ],
            )
          }
        >
          {(isFiltered) => (
            <Button
              type="button"
              variant="outlined"
              endIcon={<FilterAltOffIcon />}
              className="filter-bar__action"
              disabled={!isFiltered}
              onClick={() => {
                form.reset()
                onFilter(DEFAULT_DISPATCH_ORDERS_FILTER_VALUES)
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

export default DispatchOrdersFilterBar
