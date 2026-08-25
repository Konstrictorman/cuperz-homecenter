import logo from '../assets/logo-cuperz.png'
import Typography from '@mui/material/Typography'
import ThemeSwitch from './ThemeSwitch'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import { useState } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useTheme } from '#/contexts/ThemeContext'
import MenuBar from './MenuBar'

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
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg text-[var(--header-text)]">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <img src={logo} alt="Cuperz Logo" className="h-24 w-24 rounded-full" />
        <MenuBar />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Typography>Light</Typography>
          <ThemeSwitch
            size="small"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />

          <Typography>Dark</Typography>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
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
