import logo from '../../assets/logo-cuperz.png'
import Typography from '@mui/material/Typography'
import ThemeSwitch from '../themeSwitch/ThemeSwitch'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import { useState } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useTheme } from '#/contexts/ThemeContext'
import MenuBar from '../menuBar/MenuBar'
import './Header.css'

const Header = () => {
  const { theme, toggleTheme } = useTheme()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const buttonId = 'avatar-button'
  const menuId = 'avatar-menu'

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <header className="app-header">
      <nav className="app-header__bar">
        <img src={logo} alt="Cuperz Logo" className="app-header__logo" />
        <MenuBar />
        <div className="app-header__actions">
          <Typography>Light</Typography>
          <ThemeSwitch
            size="small"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />

          <Typography>Dark</Typography>
        </div>

        <div className="app-header__user">
          <IconButton
            size="large"
            color="inherit"
            aria-label="avatar"
            onClick={handleClick}
            aria-controls={open ? menuId : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            id={buttonId}
          >
            <Avatar sx={{ width: 56, height: 56 }} />
          </IconButton>
          <Menu
            id={menuId}
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            slotProps={{
              list: {
                'aria-labelledby': buttonId,
              },
            }}
          >
            <MenuItem onClick={handleClose}>Profile</MenuItem>
            <MenuItem onClick={handleClose}>My account</MenuItem>
            <MenuItem onClick={handleClose}>Logout</MenuItem>
          </Menu>
        </div>
      </nav>
    </header>
  )
}

export default Header
