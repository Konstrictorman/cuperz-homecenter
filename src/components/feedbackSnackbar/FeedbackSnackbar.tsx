import Alert from '@mui/material/Alert'
import type { AlertColor } from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import './FeedbackSnackbar.css'

interface FeedbackSnackbarProps {
  open: boolean
  message: string
  severity: AlertColor
  onClose: () => void
}

/** The part of the props a caller keeps in state. */
export type FeedbackSnackbarState = Pick<
  FeedbackSnackbarProps,
  'open' | 'message' | 'severity'
>

export const CLOSED_FEEDBACK: FeedbackSnackbarState = {
  open: false,
  message: '',
  severity: 'info',
}

/** Top-centred, auto-hiding outcome message for a user action. */
const FeedbackSnackbar = ({
  open,
  message,
  severity,
  onClose,
}: FeedbackSnackbarProps) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      // Ignore click-away: the click that triggers a new message would
      // otherwise dismiss it immediately. Auto-hide and ✕ still close it.
      onClose={(_event, reason) => {
        if (reason !== 'clickaway') onClose()
      }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        className="feedback-snackbar"
        severity={severity}
        onClose={onClose}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export default FeedbackSnackbar
