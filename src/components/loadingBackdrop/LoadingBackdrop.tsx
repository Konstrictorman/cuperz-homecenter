import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'

interface LoadingBackdropProps {
  open: boolean
}

/** Full-screen blocking spinner while a user-triggered request is in flight. */
const LoadingBackdrop = ({ open }: LoadingBackdropProps) => {
  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: 'var(--z-loading-backdrop)' }}
      open={open}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}

export default LoadingBackdrop
