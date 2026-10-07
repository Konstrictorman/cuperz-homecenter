import { createFileRoute } from '@tanstack/react-router'
import DispatchOrdersFilterBar, {
  DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
} from './-DisptachOrdersFilterBar'
import type { DispatchOrdersFilterValues } from './-DisptachOrdersFilterBar'
import './index.css'
import Typography from '@mui/material/Typography'
import { useState } from 'react'

const DispatchOrdersPage = () => {
  const [filters, setFilters] = useState<DispatchOrdersFilterValues>(
    DEFAULT_DISPATCH_ORDERS_FILTER_VALUES,
  )

  return (
    <div className="purchase-orders">
      <DispatchOrdersFilterBar onFilter={setFilters} />

      <p role="alert">
        <Typography className="purchase-orders__error">
          No se pudieron cargar las órdenes
        </Typography>
      </p>
    </div>
  )
}

export const Route = createFileRoute('/purchase-orders/dispatch/')({
  staticData: {
    crumb: 'Despachos',
  },
  component: DispatchOrdersPage,
})
