import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ToolBar from './ToolBar'

describe('ToolBar', () => {
  it('renders the text and actions when open', () => {
    render(
      <ToolBar
        open
        text="3 seleccionados"
        actions={[{ key: 'export', label: 'Exportar', onClick: () => {} }]}
      />,
    )

    expect(screen.getByText('3 seleccionados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(
      <ToolBar
        open={false}
        text="3 seleccionados"
        actions={[{ key: 'export', label: 'Exportar', onClick: () => {} }]}
      />,
    )

    expect(screen.queryByText('3 seleccionados')).not.toBeInTheDocument()
    expect(document.querySelector('.MuiBackdrop-root')).not.toBeInTheDocument()
  })

  it('calls the action onClick when a labeled button is clicked', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(
      <ToolBar
        open
        text="1 seleccionado"
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
        text="1 seleccionado"
        actions={[
          {
            key: 'delete',
            label: 'Eliminar',
            iconOnly: true,
            onClick: () => {},
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
        text="1 seleccionado"
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
        text="1 seleccionado"
        actions={[{ key: 'export', label: 'Exportar', onClick: () => {} }]}
      />,
    )

    expect(document.querySelector('.MuiBackdrop-root')).toBeInTheDocument()
    expect(document.querySelector('.MuiBackdrop-invisible')).toBeInTheDocument()
  })

  it('does not render the selection buttons when their handlers are not provided', () => {
    render(
      <ToolBar
        open
        text="1 seleccionado"
        actions={[{ key: 'export', label: 'Exportar', onClick: () => {} }]}
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
        text="1 seleccionado"
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
        text="1 seleccionado"
        onClearSelection={handleClearSelection}
        actions={[]}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Limpiar selección' }),
    )
    expect(handleClearSelection).toHaveBeenCalledTimes(1)
  })

  it('does not render a backdrop when blockInteraction is false', () => {
    render(
      <ToolBar
        open
        blockInteraction={false}
        text="1 seleccionado"
        actions={[{ key: 'export', label: 'Exportar', onClick: () => {} }]}
      />,
    )

    expect(document.querySelector('.MuiBackdrop-root')).not.toBeInTheDocument()
  })
})
