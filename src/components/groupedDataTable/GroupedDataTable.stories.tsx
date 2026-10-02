import type { Meta, StoryObj } from '@storybook/tanstack-react'
import type { GridColDef } from '@mui/x-data-grid'
import { db } from '#/mocks/data/db'
import GroupedDataTable from './GroupedDataTable'

interface DemoRow {
  id: string
  tienda: string
  producto: string
  cantidadOrden: number
  valorTotalOrden: number
}

const columns: GridColDef[] = [
  { field: 'tienda', headerName: 'Tienda', flex: 1, minWidth: 160 },
  { field: 'producto', headerName: 'Producto', flex: 1.5, minWidth: 220 },
  {
    field: 'cantidadOrden',
    headerName: 'Cantidad Orden',
    type: 'number',
    width: 130,
  },
  {
    field: 'valorTotalOrden',
    headerName: 'Valor Total Orden',
    type: 'number',
    width: 160,
  },
]

// Same store→product shape and real numbers as
// docs/Copy of pedidoxtiendas.xlsx (rows 43-46 and 52-54) — see
// specs/01-grouped-data-table.md's acceptance criteria.
const rows: DemoRow[] = [
  {
    id: '1',
    tienda: 'SOD SUBA',
    producto: 'TAP CUPERZ RIO GRIS 60X110',
    cantidadOrden: 4,
    valorTotalOrden: 119600,
  },
  {
    id: '2',
    tienda: 'SOD SUBA',
    producto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
    cantidadOrden: 6,
    valorTotalOrden: 135000,
  },
  {
    id: '3',
    tienda: 'SOD SUBA',
    producto: 'JB 2PZS RIO GRIS',
    cantidadOrden: 2,
    valorTotalOrden: 56400,
  },
  {
    id: '4',
    tienda: 'SOD SUBA',
    producto: 'JB 3 PIEZAS',
    cantidadOrden: 6,
    valorTotalOrden: 207600,
  },
  {
    id: '5',
    tienda: 'SOD CEDRITOS',
    producto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
    cantidadOrden: 6,
    valorTotalOrden: 135000,
  },
  {
    id: '6',
    tienda: 'SOD CEDRITOS',
    producto: 'TAP CUPERZ RIO GRIS 60X150',
    cantidadOrden: 4,
    valorTotalOrden: 163600,
  },
  {
    id: '7',
    tienda: 'SOD CEDRITOS',
    producto: 'TAPETE BORLIGHT PAMU 120X170',
    cantidadOrden: 2,
    valorTotalOrden: 353800,
  },
]

interface RealOrderRow {
  id: string
  tienda: string
  eanSku: string
  skuHomecenter: string
  descripcion: string
  cantidad: number
  costoUnitario: number
  valorLinea: number
}

// Flattens the hand-transcribed OC 15669499 sample seeded in
// `mocks/data/db.ts` (`buildRealSampleOrder`, itself sourced from
// `docs/ORD_15669499 (1).csv`) into one row per SKU×tienda pair — the same
// grain `PurchaseOrderStoresTable` renders, just store-grouped here instead
// of nested. `descripcion` is blank on most lines because the raw export
// leaves it blank (see `buildRealSampleOrder`'s comment and the
// `po-export-csv-gap` note) — left as-is rather than backfilled, so the demo
// doesn't misrepresent what the real feed actually contains.
const realOrder = db.purchaseOrders.find((o) => o.ordenCompra === '15669499')

const realOrderRows: Array<RealOrderRow> = (realOrder?.productos ?? []).flatMap(
  (producto) =>
    producto.tiendas.map((tienda) => ({
      id: `${producto.eanSku}-${tienda.eanTienda}`,
      tienda: tienda.nombreTienda,
      eanSku: producto.eanSku,
      skuHomecenter: producto.skuHomecenter,
      descripcion: producto.descripcion,
      cantidad: tienda.cantidad,
      costoUnitario: producto.costoUnitario,
      valorLinea: tienda.cantidad * producto.costoUnitario,
    })),
)

const realOrderColumns: GridColDef[] = [
  { field: 'tienda', headerName: 'Tienda', flex: 1.5, minWidth: 220 },
  { field: 'eanSku', headerName: 'EAN SKU', width: 140 },
  { field: 'skuHomecenter', headerName: 'SKU Homecenter', width: 140 },
  { field: 'descripcion', headerName: 'Descripción', flex: 1, minWidth: 160 },
  {
    field: 'cantidad',
    headerName: 'Cantidad',
    type: 'number',
    width: 110,
  },
  {
    field: 'costoUnitario',
    headerName: 'Costo Unitario',
    type: 'number',
    width: 130,
  },
  {
    field: 'valorLinea',
    headerName: 'Valor Línea',
    type: 'number',
    width: 140,
  },
]

const meta = {
  title: 'Components/GroupedDataTable',
  component: GroupedDataTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Groups rows by one column (\`groupBy\`) and shows a per-column aggregation
(\`aggregations\`: sum/count/avg/min/max) on collapsible group rows, built on
top of \`DataTable\`. This project's \`@mui/x-data-grid\` is the Community
edition — row grouping/aggregation is a Premium-only feature there — so this
is hand-built the same way \`PurchaseOrderStoresTable\` is. See
\`specs/01-grouped-data-table.md\`.

Groups start collapsed; click a group's chevron to expand it. The bar below
the grid shows the total number of groups and, for each aggregated column, a
grand total computed over the whole dataset (not just expanded rows).
Grouping column and aggregations are fixed by the consumer — there's no
runtime UI to change them, and column sorting is disabled while grouped (it
would scramble the group/child row pairing).

The demo rows below reuse the real store→product shape and numbers from
\`docs/Copy of pedidoxtiendas.xlsx\` (SOD SUBA / SOD CEDRITOS).
        `,
      },
    },
  },
} satisfies Meta<typeof GroupedDataTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    rows,
    columns,
    groupBy: 'tienda',
    aggregations: [{ field: 'valorTotalOrden', fn: 'sum' }],
  },
}

export const WithMultipleAggregations: Story = {
  args: {
    rows,
    columns,
    groupBy: 'tienda',
    aggregations: [
      { field: 'valorTotalOrden', fn: 'sum' },
      { field: 'cantidadOrden', fn: 'sum' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Any number of columns can carry their own aggregation — here both `valorTotalOrden` and `cantidadOrden` show a `sum` on every group row and in the grand-total bar.',
      },
    },
  },
}

export const Empty: Story = {
  args: {
    rows: [],
    columns,
    groupBy: 'tienda',
    aggregations: [{ field: 'valorTotalOrden', fn: 'sum' }],
  },
}

export const WithPagination: Story = {
  args: {
    rows: realOrderRows,
    columns: realOrderColumns,
    groupBy: 'tienda',
    aggregations: [
      { field: 'cantidad', fn: 'sum' },
      { field: 'valorLinea', fn: 'sum' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: `
Uses the real OC 15669499 Cross-Docking sample seeded in \`mocks/data/db.ts\`
(transcribed from \`docs/ORD_15669499 (1).csv\`) instead of hand-picked demo
numbers: 32 SKUs across 35 stores, flattened to one row per SKU×tienda pair
and grouped by \`tienda\`. \`descripcion\` is blank on most rows — that's the
raw export, not a display bug.
        `,
      },
    },
  },
}
