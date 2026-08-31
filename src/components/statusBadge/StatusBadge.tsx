import MuiChip from '@mui/material/Chip'
import './StatusBadge.css'

export type StatusBadgeTone = 'pending' | 'dispatched' | 'error' | 'processing'

interface StatusBadgeProps {
  label: string
  tone: StatusBadgeTone
}

const StatusBadge = ({ label, tone }: StatusBadgeProps) => {
  return (
    <MuiChip
      label={label}
      size="small"
      className={`status-badge status-badge--${tone}`}
    />
  )
}

export default StatusBadge
