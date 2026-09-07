import Backdrop from '@mui/material/Backdrop'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import type { ReactNode } from 'react'
import Button from '#/components/button/Button'
import type { ButtonColor } from '#/components/button/Button'
import './ToolBar.css'

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
  text: ReactNode
  actions: ToolBarAction[]
  onSelectAll?: () => void
  onClearSelection?: () => void
  blockInteraction?: boolean
  className?: string
}

const ToolBar = ({
  open,
  text,
  actions,
  onSelectAll,
  onClearSelection,
  blockInteraction = true,
  className,
}: ToolBarProps) => {
  if (!open) return null

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
        <span className="tool-bar__text">{text}</span>

        {(onSelectAll || onClearSelection) && (
          <div className="tool-bar__selection-actions">
            {onSelectAll && (
              <Button
                onClick={onSelectAll}
                color="info"
                variant="contained"
                size="small"
              >
                Seleccionar todos
              </Button>
            )}
            {onClearSelection && (
              <Button
                onClick={onClearSelection}
                color="info"
                variant="outlined"
                size="small"
              >
                Limpiar selección
              </Button>
            )}
          </div>
        )}

        <Divider
          orientation="vertical"
          flexItem
          className="tool-bar__divider"
        />

        <div className="tool-bar__actions">
          {actions.map(
            ({ key, label, icon, onClick, disabled, color, iconOnly }) =>
              iconOnly ? (
                <Tooltip key={key} title={label}>
                  <span>
                    <IconButton
                      aria-label={label}
                      onClick={onClick}
                      disabled={disabled}
                      size="small"
                      className="tool-bar__icon-button"
                    >
                      {icon}
                    </IconButton>
                  </span>
                </Tooltip>
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
              ),
          )}
        </div>
      </div>
    </>
  )
}

export default ToolBar
