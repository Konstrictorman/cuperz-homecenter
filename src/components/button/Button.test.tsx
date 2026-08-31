import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'
import type { ButtonColor } from './Button'

describe('Button', () => {
  it('renders the given label text', () => {
    render(<Button>Guardar</Button>)

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('defaults to the info color', () => {
    render(<Button>Guardar</Button>)

    expect(screen.getByRole('button')).toHaveClass('button', 'button--info')
  })

  it.each<ButtonColor>(['info', 'success', 'error', 'warning'])(
    'applies the %s color class',
    (color) => {
      render(<Button color={color}>Guardar</Button>)

      expect(screen.getByRole('button')).toHaveClass(
        'button',
        `button--${color}`,
      )
    },
  )

  it('merges a custom className with the base classes', () => {
    render(<Button className="extra-class">Guardar</Button>)

    expect(screen.getByRole('button')).toHaveClass(
      'button',
      'button--info',
      'extra-class',
    )
  })

  it('forwards standard MUI Button props', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(
      <Button variant="outlined" onClick={handleClick}>
        Guardar
      </Button>,
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('MuiButton-outlined')

    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('respects the disabled prop', () => {
    render(<Button disabled>Guardar</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })
})
