import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'
import type { StatusBadgeTone } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the given label text', () => {
    render(<StatusBadge label="Pendiente despacho" tone="pending" />)

    expect(screen.getByText('Pendiente despacho')).toBeInTheDocument()
  })

  it.each<[StatusBadgeTone, string]>([
    ['pending', 'status-badge--pending'],
    ['dispatched', 'status-badge--dispatched'],
    ['error', 'status-badge--error'],
    ['processing', 'status-badge--processing'],
  ])('applies the %s tone class', (tone, expectedClass) => {
    render(<StatusBadge label="Estado" tone={tone} />)

    expect(screen.getByText('Estado').closest('.MuiChip-root')).toHaveClass(
      'status-badge',
      expectedClass,
    )
  })

  it('renders as a single MUI Chip regardless of tone', () => {
    render(<StatusBadge label="Despachada" tone="dispatched" />)

    expect(screen.getAllByText('Despachada')).toHaveLength(1)
    expect(document.querySelectorAll('.MuiChip-root')).toHaveLength(1)
  })
})
