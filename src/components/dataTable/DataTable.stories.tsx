import type { Meta, StoryObj } from '@storybook/tanstack-react'
import type { GridColDef } from '@mui/x-data-grid'
import DataTable from './DataTable'

interface DemoRow {
  id: string
  ordenCompra: string
  cliente: string
  ciudadEntrega: string
}

const columns: GridColDef[] = [
  { field: 'ordenCompra', headerName: 'Orden Compra', flex: 1, minWidth: 130 },
  { field: 'cliente', headerName: 'Cliente', flex: 1.5, minWidth: 160 },
  {
    field: 'ciudadEntrega',
    headerName: 'Ciudad Entrega',
    flex: 1,
    minWidth: 140,
  },
]

const rows: DemoRow[] = [
  {
    id: '8467343',
    ordenCompra: '8467343',
    cliente: 'Cali Sur',
    ciudadEntrega: 'Cali',
  },
  {
    id: '17302836',
    ordenCompra: '17302836',
    cliente: 'Bogotá Norte',
    ciudadEntrega: 'Bogotá',
  },
  {
    id: '12174949',
    ordenCompra: '12174949',
    cliente: 'Bloque Cero S.A.S.',
    ciudadEntrega: 'Tunja',
  },
]

const meta = {
  title: 'Components/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Wraps MUI's \`DataGrid\` with Cuperz's shared table look and defaults:
\`checkboxSelection\`, \`disableRowSelectionOnClick\`, \`autoHeight\`,
\`hideFooterSelectedRowCount\`, and a 10/25/50 page size picker starting at
10 rows per page. Any of these can still be overridden per-usage via props,
and every other \`DataGrid\` prop (\`rows\`, \`columns\`, \`getRowId\`, etc.) is
passed straight through.

Styling comes from \`DataTable.css\`, which themes the grid's header,
checkboxes, borders, and footer from \`tokens.css\` and adds
\`[data-theme="dark"]\` overrides. Toggle the theme toolbar above to see it
switch. This is the same table used by the purchase orders list
(\`PurchaseOrdersTable\`).
        `,
      },
    },
  },
} satisfies Meta<typeof DataTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    rows,
    columns,
  },
}

export const WithoutCheckboxSelection: Story = {
  args: {
    rows,
    columns,
    checkboxSelection: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Any default can be overridden — here `checkboxSelection` is turned off, as used by nested/detail tables that should not offer row selection.',
      },
    },
  },
}

export const Empty: Story = {
  args: {
    rows: [],
    columns,
  },
}
