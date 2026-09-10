import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router'
import './MenuBar.css'
import Button from '../button/Button'
import clsx from 'clsx'
import { useState } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

const MenuBar = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const isHomeActive = Boolean(matchRoute({ to: '/' }))
  const isPurchaseOrdersGroupActive = Boolean(
    matchRoute({ to: '/purchase-orders', fuzzy: true }) ||
    matchRoute({ to: '/dispatch', fuzzy: true }) ||
    matchRoute({ to: '/receipt-notices', fuzzy: true }),
  )

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <div className="menu-bar">
      <div className="menu-bar__nav">
        <Button
          id="homeButton"
          color="default"
          className={clsx('menu-group-button', {
            'is-active': isHomeActive,
          })}
          onClick={() => navigate({ to: '/' })}
        >
          Inicio
        </Button>
        <Button
          id="purchaseOrdersMenuButton"
          color="default"
          className={clsx('menu-group-button', {
            'is-active': isPurchaseOrdersGroupActive,
          })}
          aria-controls={open ? 'purchaseOrdersMenuId' : undefined}
          onClick={handleClick}
        >
          Órdenes de Compra
        </Button>
        <Menu
          id="purchaseOrdersMenuId"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          slotProps={{
            list: {
              'aria-labelledby': 'purchaseOrdersMenuButton',
            },
          }}
        >
          <MenuItem
            component={Link}
            to="/purchase-orders"
            onClick={handleClose}
          >
            Detalles
          </MenuItem>
          <MenuItem component={Link} to="/dispatch" onClick={handleClose}>
            Despachos
          </MenuItem>
          <MenuItem
            component={Link}
            to="/receipt-notices"
            onClick={handleClose}
          >
            Recepción
          </MenuItem>
        </Menu>
      </div>
    </div>
  )
}

export default MenuBar
