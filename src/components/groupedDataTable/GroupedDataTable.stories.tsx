import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { GridActionsCellItem } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import CampaignIcon from '@mui/icons-material/Campaign'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { db } from '#/mocks/data/db'
import GroupedDataTable, {
  isGroupFooterRow,
  isGroupRow,
} from './GroupedDataTable'

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
Groups rows by one or several columns (\`groupBy\`) and shows a per-column
aggregation (\`aggregations\`: sum/count/avg/min/max, or a custom function via
\`aggregationFunctions\`) on collapsible group rows, built on top of
\`DataTable\`. This project's \`@mui/x-data-grid\` is the Community edition —
row grouping/aggregation is a Premium-only feature there — so this is
hand-built the same way \`PurchaseOrderStoresTable\` is. See
\`specs/01-grouped-data-table.md\` and
\`specs/02-grouped-data-table-advanced-grouping.md\`.

Groups start collapsed; click a group's chevron to expand it, or use the
expand-all/collapse-all toggle in the footer. The footer also shows the total
number of top-level groups and, for each aggregated column, a grand total
computed over the whole dataset (not just expanded rows). \`groupBy\` can be
an array for nested groups (outer to inner), each level indented under its
parent. \`aggregationPosition\` controls whether a group's aggregate shows
inline on its own row (the default) or on a dedicated subtotal row appended
after it. \`groupBy\` itself is fixed by the consumer, but \`aggregations\`
isn't: every numeric, non-\`groupBy\` column's header carries a
vertical-ellipsis menu (mirroring MUI X Premium's own column-header
"Aggregation" control) to set, change, or clear that column's function at
runtime — see \`WithAggregationMenu\` below. Column sorting is disabled while
grouped (it would scramble the group/child row pairing).

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

export const WithAggregationMenu: Story = {
  args: {
    rows,
    columns,
    groupBy: 'tienda',
    aggregations: [{ field: 'valorTotalOrden', fn: 'sum' }],
  },
  parameters: {
    docs: {
      description: {
        story: `
"Valor Total Orden" starts with a \`sum\` — shown as a small muted label
under its name, matching MUI X Premium's own column-header screenshot for
an aggregated column. Click the vertical-ellipsis icon at the right of
either numeric column's header ("Valor Total Orden" or "Cantidad Orden") to
open its menu: pick a different function to change it (every group row and
the grand-total bar update immediately), or "Sin agregación" to clear it.
"Cantidad Orden" starts unaggregated — its menu still opens, with no active
selection, letting you turn aggregation on for it the same way.

\`aggregations\` is left uncontrolled here (no \`onAggregationsChange\`), so
every selection just updates this story's own copy of the model — passing
\`onAggregationsChange\` instead opts into the same controlled pattern
\`paginationModel\`/\`filterModel\` already use elsewhere in this component,
for a consumer that wants to own or persist the choice.
        `,
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

export const WithFiltering: Story = {
  args: {
    rows: realOrderRows,
    columns: realOrderColumns,
    groupBy: 'tienda',
    aggregations: [{ field: 'valorLinea', fn: 'sum' }],
    // Reachable two ways in a live grid: the toolbar's own filter icon
    // (top-left funnel, `GroupedDataTableToolbar` — on by default via
    // `showToolbar`) or "Tienda"'s column header menu → Filter. Either
    // opens `GroupedDataTableFilterPanel` — its own
    // Column/Operator/Value/delete row per filter, "Agregar filtro" and
    // "Eliminar todos" buttons, replacing MUI X Community's own filter
    // panel (which cannot show either of those: the underlying `DataGrid`
    // forces `disableMultipleColumnsFiltering`, so it only ever supports
    // one filter).
    //
    // Seeded via `initialState.filter.filterModel`, *not* the `filterModel`
    // prop directly — `filterModel` is `GroupedDataTable`'s controlled-prop
    // escape hatch (same as `paginationModel`, see `WithPagination`'s own
    // `initialState.pagination.paginationModel`): passing it directly here,
    // with no `onFilterModelChange` to go with it, would freeze the model
    // at this starting value forever — every edit in the panel computes a
    // new model and reports it via that callback, but nothing would be
    // listening, so the UI could never show the change. `initialState`
    // only seeds the *first* render; from then on the panel is free to
    // add, edit, and remove filters normally.
    initialState: {
      filter: {
        filterModel: {
          items: [{ field: 'tienda', operator: 'contains', value: 'MEDELLIN' }],
        },
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
Both the toolbar's filter button (visible by default — \`showToolbar\`
defaults to \`true\` here, unlike a plain \`DataGrid\`, precisely so there's
always a visible icon for this, not just a hover-to-reveal column-header
menu) and the column header's own "Filter" menu item open the same panel:
\`GroupedDataTableFilterPanel\`. It replaces MUI X Community's own filter
panel rather than reusing it — Community's forces
\`disableMultipleColumnsFiltering\`, hiding the "+ ADD FILTER"/"REMOVE ALL"
controls from the screenshot this story was requested from and truncating
\`filterModel.items\` to one entry on every change. This panel instead reads
and writes \`filterModel\` directly through \`GroupedDataTable\`'s own state
(bypassing that restriction entirely), supporting any number of filters
with a delete button on each row, an AND/OR toggle once there's more than
one, and "Agregar filtro"/"Eliminar todos" buttons.

Filtering runs on the real, un-flattened rows *before* grouping — so a
column-value filter applies per leaf row (here, \`tienda\` \`contains\`
"MEDELLIN" keeps only the 3 of 35 stores matching it: "SODIMAC - MEDELLIN
INDUSTRIALES", "SODIMAC - MEDELLIN MOLINOS", and "SODIMAC - MEDELLIN SAN
JUAN" — try widening the value to just "SODIMAC" to see all 35 return), and
a group with zero matching rows simply doesn't appear at all, rather than
showing empty. The grand-total footer is scoped to the filtered rows too,
not the full 35-store dataset — matching MUI X Premium's own default
\`aggregationRowsScope: 'filtered'\`.
        `,
      },
    },
  },
}

export const WithColumnVisibility: Story = {
  args: {
    rows: realOrderRows,
    columns: realOrderColumns,
    groupBy: 'tienda',
    aggregations: [{ field: 'valorLinea', fn: 'sum' }],
  },
  parameters: {
    docs: {
      description: {
        story: `
Reachable two ways, same as filtering above: the toolbar's columns icon
(\`GroupedDataTableToolbar\`, on by default via \`showToolbar\`) or any column
header's own menu → "Manage columns". Both open MUI X Community's own
columns panel (\`GridColumnsPanel\`/\`GridColumnsManagement\`) completely
unmodified — a search box, one checkbox per column, and "Show/Hide All"/
"Reset" — unlike the filter panel, Community's column-visibility model has
no restriction this component needs to work around.

The one guard that *is* needed: "Tienda" is the \`groupBy\` field — hiding its
column would take the expand/collapse chevron (and group label) with it, so
its checkbox is disabled rather than togglable (\`hideable: false\` in
\`toGroupAwareColumn\`), the same way MUI X Premium's own screenshots mark a
non-hideable column. Every other column — \`eanSku\`, \`skuHomecenter\`,
\`descripcion\`, \`cantidad\`, \`costoUnitario\`, \`valorLinea\` — hides and shows
normally; try unchecking a few to narrow the table to just the columns you
care about.
        `,
      },
    },
  },
}

interface DispatchRow {
  id: string
  tienda: string
  contenedor: string
  producto: string
  cantidad: number
}

const dispatchColumns: GridColDef[] = [
  { field: 'tienda', headerName: 'Tienda', flex: 1, minWidth: 140 },
  { field: 'contenedor', headerName: 'Contenedor', flex: 1, minWidth: 120 },
  { field: 'producto', headerName: 'Producto', flex: 1.5, minWidth: 200 },
  { field: 'cantidad', headerName: 'Cantidad', type: 'number', width: 110 },
]

// Illustrative only — not sourced from a real dispatch-notice sample. Shaped
// after the domain's Orden → Tienda → Contenedor → Producto hierarchy (see
// the project's root CLAUDE.md); "Contenedor 1" repeats under both stores on
// purpose, to show that same-named containers at different stores are kept
// as independent, independently-collapsible nodes.
const dispatchRows: DispatchRow[] = [
  {
    id: '1',
    tienda: 'SOD SUBA',
    contenedor: 'Contenedor 1',
    producto: 'TAP CUPERZ RIO GRIS 60X110',
    cantidad: 4,
  },
  {
    id: '2',
    tienda: 'SOD SUBA',
    contenedor: 'Contenedor 1',
    producto: 'JB 2PZS RIO GRIS',
    cantidad: 2,
  },
  {
    id: '3',
    tienda: 'SOD SUBA',
    contenedor: 'Contenedor 2',
    producto: 'JB 3 PIEZAS',
    cantidad: 6,
  },
  {
    id: '4',
    tienda: 'SOD CEDRITOS',
    contenedor: 'Contenedor 1',
    producto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
    cantidad: 6,
  },
]

export const MultiLevelGrouping: Story = {
  args: {
    rows: dispatchRows,
    columns: dispatchColumns,
    groupBy: ['tienda', 'contenedor'],
    aggregations: [{ field: 'cantidad', fn: 'sum' }],
  },
  parameters: {
    docs: {
      description: {
        story:
          '`groupBy` accepts an array for nested groups — here Tienda → Contenedor, each level indented under its parent. "Contenedor 1" appears under both stores as two independent nodes, each with its own count/collapse state.',
      },
    },
  },
}

export const WithFooterAggregationPosition: Story = {
  args: {
    rows,
    columns,
    groupBy: 'tienda',
    aggregations: [{ field: 'valorTotalOrden', fn: 'sum' }],
    aggregationPosition: 'footer',
  },
  parameters: {
    docs: {
      description: {
        story:
          'With `aggregationPosition="footer"`, a group\'s own row is left blank for aggregated columns and a dedicated "Subtotal <value>" row carries the total instead — shown even while the group is collapsed, same as the dataset-wide grand total.',
      },
    },
  },
}

// `getActions` checks `isGroupRow`/`isGroupFooterRow` itself —
// GroupedDataTable never touches an `actions` column's own rendering (see
// `toGroupAwareColumn` in GroupedDataTable.tsx and
// specs/03-grouped-data-table-actions-column.md), the same way MUI X
// Premium's own `getActions` branches on `params.rowNode.type` to vary
// actions by row kind. The leaf-row action mirrors the real "Ver detalle"
// action on `PurchaseOrdersTable`
// (`src/routes/purchase-orders/details/-usePurchaseOrdersColumns.tsx`:
// `VisibilityIcon` + `GridActionsCellItem`, `onClick` reading the clicked
// row) rather than inventing a demo-only shape for it.
const columnsWithActions: GridColDef[] = [
  ...columns,
  {
    field: 'actions',
    type: 'actions',
    headerName: '',
    width: 60,
    getActions: (params) => {
      if (isGroupRow(params.row)) {
        return [
          <GridActionsCellItem
            key="maximus"
            icon={<CampaignIcon fontSize="small" />}
            label="Maximus"
            onClick={() => alert(`Maximus: ${params.row.groupValue}`)}
          />,
        ]
      }
      if (isGroupFooterRow(params.row)) {
        return []
      }
      // Leaf row.
      return [
        <GridActionsCellItem
          key="ver-detalle"
          icon={<VisibilityIcon fontSize="small" />}
          label="Ver detalle"
          onClick={() => alert(`Ver detalle: ${params.row.producto}`)}
        />,
      ]
    },
  },
]

export const WithActionsColumn: Story = {
  args: {
    rows,
    columns: columnsWithActions,
    groupBy: 'tienda',
    aggregations: [{ field: 'valorTotalOrden', fn: 'sum' }],
  },
  parameters: {
    docs: {
      description: {
        story: `
An \`actions\`-type column (\`getActions\`/\`GridActionsCellItem\`, MUI X's
standard pattern) works unmodified inside \`GroupedDataTable\` — it isn't a
\`groupBy\` field or an aggregated column, so \`GroupedDataTable\` never
touches its rendering, for any row kind. \`getActions\` returns a different
action depending on which kind of row it was called for: a group row shows
a "Maximus" icon button (\`alert\`-ing that group's own name, e.g.
\`Maximus: SOD SUBA\`); a leaf/\`producto\` row — expand a group to see them —
shows a "Ver detalle" icon button instead, the same \`VisibilityIcon\` +
\`GridActionsCellItem\` action \`PurchaseOrdersTable\` uses for real
(\`alert\`-ing that row's own \`producto\`, e.g.
\`Ver detalle: TAP CUPERZ RIO GRIS 60X110\`, standing in for what would be
\`onViewDetail?.(params.row)\` there). Both branches are the consumer's own
\`getActions\` checking the exported \`isGroupRow\`/\`isGroupFooterRow\`
guards against \`params.row\` — not a \`GroupedDataTable\` prop — the same
way an MUI X Premium \`getActions\` would branch on \`params.rowNode.type\`.
        `,
      },
    },
  },
}
