import MuiChip from '@mui/material/Chip'
import clsx from 'clsx'
import './StatusBadge.css'
import type { OrderStatusType } from '#/routes/purchase-orders/types'

interface StatusBadgeProps {
  label: string
  tone: OrderStatusType
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
