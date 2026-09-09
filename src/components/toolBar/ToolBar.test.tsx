import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteIcon from '@mui/icons-material/Delete'
import ToolBar from './ToolBar'

/**
 * Force `useMediaQuery('(max-width: 640px)')` to report a match, simulating
 * a mobile-width viewport. Restored automatically by `afterEach`.
 */
const simulateMobileWidth = () => {
  window.matchMedia = (query: string) =>
    ({
      matches: /max-width/.test(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

const noop = () => {}

describe('ToolBar', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('renders the selection count and actions when open', () => {
    render(
      <ToolBar
        open
        selected={3}
        onClose={noop}
        actions={[{ key: 'export', label: 'Exportar', onClick: noop }]}
      />,
    )

    expect(screen.getByText('3 Registros Seleccionados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(
      <ToolBar
        open={false}
        selected={3}
        onClose={noop}
        actions={[{ key: 'export', label: 'Exportar', onClick: noop }]}
      />,
    )

    expect(screen.queryByText(/Seleccionados/)).not.toBeInTheDocument()
    expect(document.querySelector('.MuiBackdrop-root')).not.toBeInTheDocument()
  })

  it('calls the action onClick when a labeled button is clicked', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        actions={[{ key: 'export', label: 'Exportar', onClick: handleClick }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders an icon-only action as an icon button using label as its aria-label', () => {
    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        actions={[
          {
            key: 'delete',
            label: 'Eliminar',
            iconOnly: true,
            onClick: noop,
          },
        ]}
      />,
    )

    const button = screen.getByRole('button', { name: 'Eliminar' })
    expect(button).toHaveClass('tool-bar__icon-button')
  })

  it('disables the action button so it cannot be clicked', () => {
    const handleClick = jest.fn()

    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        actions={[
          {
            key: 'export',
            label: 'Exportar',
            disabled: true,
            onClick: handleClick,
          },
        ]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled()
  })

  it('renders an invisible backdrop by default (blockInteraction defaults to true)', () => {
    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        actions={[{ key: 'export', label: 'Exportar', onClick: noop }]}
      />,
    )

    expect(document.querySelector('.MuiBackdrop-root')).toBeInTheDocument()
    expect(document.querySelector('.MuiBackdrop-invisible')).toBeInTheDocument()
  })

  it('does not render the selection buttons when their handlers are not provided', () => {
    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        actions={[{ key: 'export', label: 'Exportar', onClick: noop }]}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Seleccionar todos' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Limpiar selección' }),
    ).not.toBeInTheDocument()
  })

  it('calls onSelectAll when "Seleccionar todos" is clicked', async () => {
    const user = userEvent.setup()
    const handleSelectAll = jest.fn()

    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        onSelectAll={handleSelectAll}
        actions={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Seleccionar todos' }))
    expect(handleSelectAll).toHaveBeenCalledTimes(1)
  })

  it('calls onClearSelection when "Limpiar selección" is clicked', async () => {
    const user = userEvent.setup()
    const handleClearSelection = jest.fn()

    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        onClearSelection={handleClearSelection}
        actions={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Limpiar selección' }))
    expect(handleClearSelection).toHaveBeenCalledTimes(1)
  })

  it('renders the selection actions as icon buttons when selectionActionsIconOnly is set', async () => {
    const user = userEvent.setup()
    const handleSelectAll = jest.fn()
    const handleClearSelection = jest.fn()

    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        selectionActionsIconOnly
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        actions={[]}
      />,
    )

    const selectAll = screen.getByRole('button', { name: 'Seleccionar todos' })
    const clearSelection = screen.getByRole('button', {
      name: 'Limpiar selección',
    })

    expect(selectAll).toHaveClass('tool-bar__icon-button')
    expect(clearSelection).toHaveClass('tool-bar__icon-button')

    await user.click(selectAll)
    await user.click(clearSelection)
    expect(handleSelectAll).toHaveBeenCalledTimes(1)
    expect(handleClearSelection).toHaveBeenCalledTimes(1)
  })

  it('collapses actions with an icon to icon buttons on mobile widths', () => {
    simulateMobileWidth()
    const handleClick = jest.fn()

    render(
      <ToolBar
        open
        selected={2}
        onClose={noop}
        actions={[
          {
            key: 'delete',
            label: 'Eliminar',
            icon: <DeleteIcon fontSize="small" />,
            onClick: handleClick,
          },
        ]}
      />,
    )

    const button = screen.getByRole('button', { name: 'Eliminar' })
    expect(button).toHaveClass('tool-bar__icon-button')
  })

  it('keeps the label for an icon-less action on mobile widths', () => {
    simulateMobileWidth()

    render(
      <ToolBar
        open
        selected={2}
        onClose={noop}
        actions={[{ key: 'export', label: 'Exportar', onClick: noop }]}
      />,
    )

    const button = screen.getByRole('button', { name: 'Exportar' })
    expect(button).not.toHaveClass('tool-bar__icon-button')
    expect(button).toHaveTextContent('Exportar')
  })

  it('collapses the selection controls to icon buttons on mobile widths', () => {
    simulateMobileWidth()

    render(
      <ToolBar
        open
        selected={2}
        onClose={noop}
        onSelectAll={noop}
        onClearSelection={noop}
        actions={[]}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Seleccionar todos' }),
    ).toHaveClass('tool-bar__icon-button')
    expect(
      screen.getByRole('button', { name: 'Limpiar selección' }),
    ).toHaveClass('tool-bar__icon-button')
  })

  it('does not render a backdrop when blockInteraction is false', () => {
    render(
      <ToolBar
        open
        selected={1}
        onClose={noop}
        blockInteraction={false}
        actions={[{ key: 'export', label: 'Exportar', onClick: noop }]}
      />,
    )

    expect(document.querySelector('.MuiBackdrop-root')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = jest.fn()

    render(
      <ToolBar
        open
        selected={1}
        onClose={handleClose}
        actions={[{ key: 'export', label: 'Exportar', onClick: noop }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
