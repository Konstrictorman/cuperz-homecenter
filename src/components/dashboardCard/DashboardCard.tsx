import MuiCard from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import type { ComponentType } from 'react'

interface DashboardCardProps {
  title: string
  description: string
  highlight: string | number
  icon?: ComponentType<SvgIconProps>
}

const DashboardCard = ({
  title,
  description,
  highlight,
  icon: Icon,
}: DashboardCardProps) => {
  return (
    <div className="p-8">
      <MuiCard className="w-[240px] sm:w-[320px] md:w-[360px] dark:bg-palette-background-default! dark:text-palette-text-primary! border-[var(--line)] dark:border-[var(--line)] border-1 rounded-2xl!">
        <CardContent>
          <Typography className="h-12 sm:h-16 md:h-24 text-lg! sm:text-xl! md:text-2xl! font-weight-medium">
            {title}
          </Typography>

          <div className="flex items-center justify-between mb-2">
            {Icon && (
              <Icon className="text-36! sm:text-48! md:text-60! text-cuperz-primary-500 dark:text-[var(--cuperz-neutral-25)]" />
            )}
            <Typography
              variant="h1"
              component="h1"
              className="font-weight-large text-cuperz-primary-500 dark:text-[var(--cuperz-neutral-25)] text-4xl! sm:text-5xl! md:text-6xl!"
            >
              {highlight}
            </Typography>
          </div>

          <Typography
            variant="subtitle1"
            component="span"
            className="text-sm! sm:text-base!"
          >
            {description}
          </Typography>
        </CardContent>
      </MuiCard>
    </div>
  )
}

export default DashboardCard
