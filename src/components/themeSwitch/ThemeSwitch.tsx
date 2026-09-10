import Switch from '@mui/material/Switch'
import { styled } from '@mui/material/styles'

const ThemeSwitch = styled(Switch)(({ theme }) => ({
  width: 44,
  height: 24,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 2,
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: '#1F1F1F',
        opacity: 1,
        border: 0,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      outline: `2px solid ${theme.palette.grey[500]}`,
      outlineOffset: 2,
    },
  },
  '& .MuiSwitch-thumb': {
    width: 20,
    height: 20,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  },
  '& .MuiSwitch-track': {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    border: `1px solid ${theme.palette.grey[400]}`,
    opacity: 1,
    transition: theme.transitions.create(['background-color', 'border'], {
      duration: 200,
    }),
  },
}))

export default ThemeSwitch
