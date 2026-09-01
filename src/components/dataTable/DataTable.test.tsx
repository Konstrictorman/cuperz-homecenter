import { render, screen } from '@testing-library/react'
import type { GridColDef } from '@mui/x-data-grid'
import DataTable from './DataTable'

interface DemoRow {
  id: string
  name: string
}

const columns: GridColDef<DemoRow>[] = [
  { field: 'name', headerName: 'Nombre', flex: 1 },
]

const rows: DemoRow[] = [
  { id: '1', name: 'Cali Sur' },
  { id: '2', name: 'Bogotá Norte' },
]

describe('DataTable', () => {
  it('renders the given rows and columns', () => {
    render(<DataTable rows={rows} columns={columns} />)

    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Cali Sur')).toBeInTheDocument()
    expect(screen.getByText('Bogotá Norte')).toBeInTheDocument()
  })

  it('wraps the grid in the data-table styling class', () => {
    const { container } = render(<DataTable rows={rows} columns={columns} />)

    expect(container.querySelector('.data-table')).toBeInTheDocument()
  })

  it('enables row selection checkboxes by default', () => {
    render(<DataTable rows={rows} columns={columns} />)

    expect(
      screen.getAllByRole('checkbox', { name: /select row/i }).length,
    ).toBeGreaterThan(0)
  })

  it('allows overriding checkboxSelection', () => {
    render(
      <DataTable rows={rows} columns={columns} checkboxSelection={false} />,
    )

    expect(
      screen.queryAllByRole('checkbox', { name: /select row/i }),
    ).toHaveLength(0)
  })

  it('merges a custom className with the base classes', () => {
    const { container } = render(
      <DataTable rows={rows} columns={columns} className="extra-class" />,
    )

    expect(
      container.querySelector('.data-table.extra-class'),
    ).toBeInTheDocument()
  })
})
