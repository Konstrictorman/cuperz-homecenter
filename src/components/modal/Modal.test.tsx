import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

describe('Modal', () => {
  it('renders the title and children when open', () => {
    render(
      <Modal title="Detalle" onOpen onClose={() => {}}>
        <p>Contenido</p>
      </Modal>,
    )

    expect(screen.getByText('Detalle')).toBeInTheDocument()
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal title="Detalle" onOpen={false} onClose={() => {}}>
        <p>Contenido</p>
      </Modal>,
    )

    expect(screen.queryByText('Detalle')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = jest.fn()

    render(
      <Modal title="Detalle" onOpen onClose={handleClose}>
        <p>Contenido</p>
      </Modal>,
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const handleClose = jest.fn()

    render(
      <Modal title="Detalle" onOpen onClose={handleClose}>
        <p>Contenido</p>
      </Modal>,
    )

    await user.keyboard('{Escape}')
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
