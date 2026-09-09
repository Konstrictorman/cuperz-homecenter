import { Link } from '@tanstack/react-router'
import './MenuBar.css'
import Typography from '@mui/material/Typography'

const MenuBar = () => {
  return (
    <div className="menu-bar">
      <div className="menu-bar__nav">
        <Link
          to="/"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          <Typography>Inicio</Typography>
        </Link>
        <Link
          to="/purchase-orders"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          <Typography>Órdenes de Compra</Typography>
        </Link>
        <Link
          to="/dispatch"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          <Typography>Despachos</Typography>
        </Link>
        <Link
          to="/receipt-notices"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          <Typography>Avisos de Recepción</Typography>
        </Link>
      </div>
    </div>
  )
}

export default MenuBar
