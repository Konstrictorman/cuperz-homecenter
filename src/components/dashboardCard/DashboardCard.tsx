import MuiCard from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import type { ComponentType } from 'react'
import './DashboardCard.css'
import clsx from 'clsx'

interface DashboardCardProps {
  title: string
  description: string
  highlight: number
  icon?: ComponentType<SvgIconProps>
}

const DashboardCard = ({
  title,
  description,
  highlight,
  icon: Icon,
}: DashboardCardProps) => {
  const pulse = highlight > 0 ? 'pulse' : ''
  return (
    <div className="dashboardCard__wrap">
      <MuiCard className="dashboardCard">
        <CardContent>
          <Typography className="dashboardCard__title">{title}</Typography>

          <div className="dashboardCard__row">
            {Icon && <Icon className="dashboardCard__icon" />}
            <Typography
              variant="h1"
              component="h1"
              className={clsx('dashboardCard__value', { pulse })}
            >
              {highlight}
            </Typography>
          </div>

          <Typography
            variant="subtitle1"
            component="span"
            className="dashboardCard__desc"
          >
            {description}
          </Typography>
        </CardContent>
      </MuiCard>
    </div>
  )
}

export default DashboardCard
