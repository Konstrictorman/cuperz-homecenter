import MuiBreadcrumbs from '@mui/material/Breadcrumbs'
import Typography from '@mui/material/Typography'
import { Link, useMatches } from '@tanstack/react-router'
import './Breadcrumbs.css'

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    crumb?: string
  }
}

const Breadcrumbs = () => {
  const matches = useMatches()

  const crumbs = matches
    .filter((match) => Boolean(match.staticData.crumb))
    .map((match) => ({
      key: match.id,
      to: match.fullPath,
      label: match.staticData.crumb as string,
    }))

  if (crumbs.length === 0) return null

  const current = crumbs[crumbs.length - 1]
  const ancestors = crumbs.slice(0, -1)

  return (
    <MuiBreadcrumbs
      aria-label="breadcrumb"
      className="cuperz-breadcrumbs py-2 px-4 sm:py-3 sm:px-6 text-sm sm:text-base h-12"
    >
      {ancestors.map((crumb) => (
        <Link
          key={crumb.key}
          // `to` is only known at runtime here (built from the matched route tree),
          // so it can't satisfy the router's registered literal-path union.
          to={crumb.to as never}
          className="cuperz-breadcrumbs__link"
        >
          {crumb.label}
        </Link>
      ))}
      <Typography
        component="span"
        className="font-bold! text-palette-text-primary! dark:text-palette-text-primary!"
      >
        {current.label}
      </Typography>
    </MuiBreadcrumbs>
  )
}

export default Breadcrumbs
