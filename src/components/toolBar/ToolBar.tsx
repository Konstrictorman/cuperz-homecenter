import DoneAllIcon from '@mui/icons-material/DoneAll'
import RemoveDoneIcon from '@mui/icons-material/RemoveDone'
import Backdrop from '@mui/material/Backdrop'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { ReactNode } from 'react'
import Button from '#/components/button/Button'
import type { ButtonColor } from '#/components/button/Button'
import './ToolBar.css'

/**
 * Below this viewport width the bar collapses to its icon-only layout
 * regardless of the `iconOnly` / `selectionActionsIconOnly` props, so the
 * floating bar never overflows a phone screen. Matches the `640px`
 * breakpoint used elsewhere (see `MenuBar.css`).
 */
const COMPACT_QUERY = '(max-width: 640px)'

export interface ToolBarAction {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  color?: ButtonColor
  iconOnly?: boolean
}

export interface ToolBarProps {
  open: boolean
  selected: number
  actions: ToolBarAction[]
  onSelectAll?: () => void
  onClearSelection?: () => void
  onClose: () => void
  /**
   * Render the `onSelectAll` / `onClearSelection` controls as icon buttons
   * (`DoneAll` / `RemoveDone`) instead of labeled buttons. On mobile widths
   * they always render as icons regardless of this prop.
   */
  selectionActionsIconOnly?: boolean
  blockInteraction?: boolean
  className?: string
}

const ToolBarIconButton = ({
  label,
  icon,
  onClick,
  disabled,
  className,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) => (
  <Tooltip title={label}>
    <span>
      <IconButton
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        size="small"
        className={['tool-bar__icon-button', className]
          .filter(Boolean)
          .join(' ')}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
)

const ToolBar = ({
  open,
  selected,
  actions,
  onSelectAll,
  onClearSelection,
  selectionActionsIconOnly = false,
  blockInteraction = true,
  onClose,
  className,
}: ToolBarProps) => {
  const compact = useMediaQuery(COMPACT_QUERY)

  if (!open) return null

  const selectionAsIcons = selectionActionsIconOnly || compact
  const text = selectionAsIcons ? 'Seleccionados' : 'Registros Seleccionados'

  return (
    <>
      {blockInteraction && (
        <Backdrop open invisible className="tool-bar__backdrop" />
      )}
      <div
        role="toolbar"
        aria-label="Acciones sobre la selección"
        className={['tool-bar', className].filter(Boolean).join(' ')}
      >
        <span className="tool-bar__text">
          {selected} {text}
        </span>

        {(onSelectAll || onClearSelection) && (
          <div className="tool-bar__selection-actions">
            {onSelectAll &&
              (selectionAsIcons ? (
                <ToolBarIconButton
                  label="Seleccionar todos"
                  icon={<DoneAllIcon fontSize="small" />}
                  onClick={onSelectAll}
                />
              ) : (
                <Button
                  onClick={onSelectAll}
                  color="info"
                  variant="contained"
                  size="small"
                >
                  Seleccionar todos
                </Button>
              ))}
            {onClearSelection &&
              (selectionAsIcons ? (
                <ToolBarIconButton
                  label="Limpiar selección"
                  icon={<RemoveDoneIcon fontSize="small" />}
                  onClick={onClearSelection}
                />
              ) : (
                <Button
                  onClick={onClearSelection}
                  color="info"
                  variant="outlined"
                  size="small"
                >
                  Limpiar selección
                </Button>
              ))}
          </div>
        )}

        <Divider
          orientation="vertical"
          flexItem
          className="tool-bar__divider"
        />

        <div className="tool-bar__actions">
          {actions.map(
            ({ key, label, icon, onClick, disabled, color, iconOnly }) => {
              // `iconOnly` is honored as-is; the mobile auto-collapse only
              // applies to actions that actually have an icon to show, so an
              // icon-less action keeps its label instead of rendering empty.
              const asIcon = iconOnly || (compact && Boolean(icon))

              return asIcon ? (
                <ToolBarIconButton
                  key={key}
                  label={label}
                  icon={icon}
                  onClick={onClick}
                  disabled={disabled}
                />
              ) : (
                <Button
                  key={key}
                  onClick={onClick}
                  disabled={disabled}
                  color={color}
                  startIcon={icon}
                  size="small"
                >
                  {label}
                </Button>
              )
            },
          )}
        </div>
        <Divider
          orientation="vertical"
          flexItem
          className="tool-bar__divider"
        />
        <ToolBarIconButton
          className="tool-bar__close-button"
          label="Cerrar"
          icon={<CloseIcon fontSize="small" />}
          onClick={onClose}
        />
      </div>
    </>
  )
}

export default ToolBar
