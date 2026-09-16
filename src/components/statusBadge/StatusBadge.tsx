import MuiChip from '@mui/material/Chip'
import clsx from 'clsx'
import './StatusBadge.css'

export type StatusBadgeTone =
  | 'pending'
  | 'dispatched'
  | 'error'
  | 'processing'
  | 'partial'
  | 'cancelled'
  | 'exceeded'

interface StatusBadgeProps {
  label: string
  tone: StatusBadgeTone
}

const StatusBadge = ({ label, tone }: StatusBadgeProps) => {
  return (
    <MuiChip
      label={label}
      size="small"
      className={clsx('status-badge', `status-badge--${tone}`)}
    />
  )
}

export default StatusBadge
