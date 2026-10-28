import DashboardCard from '#/components/dashboardCard/DashboardCard'
import { createFileRoute } from '@tanstack/react-router'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import LocalPostOfficeIcon from '@mui/icons-material/LocalPostOffice'
import './index.css'
import { purchaseOrdersListQueryOptions } from '#/api/purchase-orders'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/')({
  component: Home,
  staticData: {
    crumb: 'Inicio',
  },
})

function Home() {
  // pageSize: 1 — only pagination.total is needed, not the rows
  const pendingOrders = useQuery(
    purchaseOrdersListQueryOptions({ estado: 'PENDIENTE', pageSize: 1 }),
  )

  const processingOrders = useQuery(
    purchaseOrdersListQueryOptions({ estado: 'PREPARADO', pageSize: 1 }),
  )

  const receivedOrders = useQuery(
    purchaseOrdersListQueryOptions({ estado: 'DESPACHADO', pageSize: 1 }),
  )

  return (
    <div className="dashboard" id="dashboard-cards">
      <div className="dashboard__grid">
        <DashboardCard
          title={'Órdenes de compra sin procesar'}
          description={'Órdenes que no han sido cargadas'}
          highlight={pendingOrders.data?.pagination.total ?? 0}
          icon={PendingActionsIcon}
        />
        <DashboardCard
          title={'Despachos sin procesar'}
          description={'Pendientes de enviar a HC'}
          highlight={processingOrders.data?.pagination.total ?? 0}
          icon={LocalShippingIcon}
        />
        <DashboardCard
          title={'Avisos de recibo por confirmar'}
          description={'Recepciones pendientes de parte de HC'}
          highlight={receivedOrders.data?.pagination.total ?? 0}
          icon={LocalPostOfficeIcon}
        />
      </div>
    </div>
  )
}
