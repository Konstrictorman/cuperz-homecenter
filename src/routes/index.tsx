import DashboardCard from '#/components/dashboardCard/DashboardCard'
import { createFileRoute } from '@tanstack/react-router'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import LocalPostOfficeIcon from '@mui/icons-material/LocalPostOffice'
import './index.css'

export const Route = createFileRoute('/')({
  component: Home,
  staticData: {
    crumb: 'Inicio',
  },
})

function Home() {
  return (
    <div className="dashboard" id="dashboard-cards">
      <div className="dashboard__grid">
        <DashboardCard
          title={'Órdenes de compra sin procesar'}
          description={'Últimas 24 horas'}
          highlight={7}
          icon={PendingActionsIcon}
        />
        <DashboardCard
          title={'Despachos sin procesar'}
          description={'Últimas 24 horas'}
          highlight={24}
          icon={LocalShippingIcon}
        />
        <DashboardCard
          title={'Avisos de recibo'}
          description={'Última hora'}
          highlight={11}
          icon={LocalPostOfficeIcon}
        />
      </div>
    </div>
  )
}
