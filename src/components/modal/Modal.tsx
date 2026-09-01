import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import type { DialogProps } from '@mui/material/Dialog'
import type { ReactNode } from 'react'
import './Modal.css'

export interface ModalProps extends Omit<
  DialogProps,
  'title' | 'open' | 'onClose'
> {
  title: ReactNode
  children: ReactNode
  onOpen: boolean
  onClose: () => void
}

const Modal = ({
  title,
  children,
  onOpen,
  onClose,
  className,
  fullWidth = true,
  maxWidth = 'lg',
  ...props
}: ModalProps) => {
  return (
    <Dialog
      {...props}
      open={onOpen}
      onClose={onClose}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      className={['modal', className].filter(Boolean).join(' ')}
    >
      <DialogTitle className="modal__title flex items-center justify-between gap-4">
        {title}
        <IconButton onClick={onClose} size="small" aria-label="Cerrar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers className="modal__content">
        {children}
      </DialogContent>
    </Dialog>
  )
}

export default Modal
