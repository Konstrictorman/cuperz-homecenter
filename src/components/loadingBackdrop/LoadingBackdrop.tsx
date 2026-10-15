import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'

export interface LoadingBackdropProps {
  open: boolean
}

/** Full-screen blocking spinner while a user-triggered request is in flight. */
const LoadingBackdrop = ({ open }: LoadingBackdropProps) => {
  return (
    <Backdrop
      sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
      open={open}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}

export default LoadingBackdrop
