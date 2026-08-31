import { Link } from '@tanstack/react-router'
import './MenuBar.css'

const MenuBar = () => {
  return (
    <div>
      <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-nowrap sm:pb-0">
        <Link
          to="/"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          Inicio
        </Link>
        <Link
          to="/purchase-orders"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          Órdenes de Compra
        </Link>
        <Link
          to="/dispatch"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          Despachos
        </Link>
        <Link
          to="/receipt-notices"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          Avisos de Recepción
        </Link>
      </div>
    </div>
  )
}

export default MenuBar
