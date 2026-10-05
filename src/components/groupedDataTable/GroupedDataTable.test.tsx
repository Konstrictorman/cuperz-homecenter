import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GridActionsCellItem } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import GroupedDataTable, { isGroupRow } from './GroupedDataTable'

interface DemoRow {
  id: string
  tienda: string
  producto: string
  cantidadOrden: number
  valorTotalOrden: number
}

const columns: GridColDef[] = [
  { field: 'tienda', headerName: 'Tienda', flex: 1 },
  { field: 'producto', headerName: 'Producto', flex: 1 },
  { field: 'cantidadOrden', headerName: 'Cantidad Orden', type: 'number' },
  {
    field: 'valorTotalOrden',
    headerName: 'Valor Total Orden',
    type: 'number',
  },
]

const rows: DemoRow[] = [
  {
    id: '1',
    tienda: 'SOD SUBA',
    producto: 'Tapete A',
    cantidadOrden: 4,
    valorTotalOrden: 119600,
  },
  {
    id: '2',
    tienda: 'SOD SUBA',
    producto: 'Tapete B',
    cantidadOrden: 6,
    valorTotalOrden: 135000,
  },
  {
    id: '3',
    tienda: 'SOD CEDRITOS',
    producto: 'Tapete C',
    cantidadOrden: 6,
    valorTotalOrden: 135000,
  },
]

describe('GroupedDataTable', () => {
  it('renders one group row per distinct groupBy value, collapsed by default', () => {
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.getByText('SOD CEDRITOS (1)')).toBeInTheDocument()
    expect(screen.queryByText('Tapete A')).not.toBeInTheDocument()
    expect(screen.queryByText('Tapete B')).not.toBeInTheDocument()
    expect(screen.queryByText('Tapete C')).not.toBeInTheDocument()
  })

  it('expands a group on chevron click and collapses it again on a second click, without affecting other groups', () => {
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    fireEvent.click(screen.getAllByLabelText('Expandir grupo')[0])

    expect(screen.getByText('Tapete A')).toBeInTheDocument()
    expect(screen.getByText('Tapete B')).toBeInTheDocument()
    expect(screen.queryByText('Tapete C')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Contraer grupo'))

    expect(screen.queryByText('Tapete A')).not.toBeInTheDocument()
    expect(screen.queryByText('Tapete B')).not.toBeInTheDocument()
  })

  it("shows a right-pointing chevron while collapsed and a down-pointing one once expanded, matching MUI X Premium's own grouping column", () => {
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    const subaChevron = screen.getAllByLabelText('Expandir grupo')[0]
    expect(
      within(subaChevron).getByTestId('KeyboardArrowRightIcon'),
    ).toBeInTheDocument()
    expect(
      within(subaChevron).queryByTestId('KeyboardArrowDownIcon'),
    ).not.toBeInTheDocument()

    fireEvent.click(subaChevron)

    const expandedChevron = screen.getByLabelText('Contraer grupo')
    expect(
      within(expandedChevron).getByTestId('KeyboardArrowDownIcon'),
    ).toBeInTheDocument()
    expect(
      within(expandedChevron).queryByTestId('KeyboardArrowRightIcon'),
    ).not.toBeInTheDocument()
  })

  it('leaves the grouped field blank on leaf rows instead of repeating the group value on every one of them', () => {
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    fireEvent.click(screen.getAllByLabelText('Expandir grupo')[0])

    const tapeteARow = screen
      .getByText('Tapete A')
      .closest('.MuiDataGrid-row') as HTMLElement
    expect(tapeteARow.querySelector('[data-field="tienda"]')).toHaveTextContent(
      '',
    )
    // The row's own field still renders normally — only the grouped field
    // is suppressed.
    expect(within(tapeteARow).getByText('Tapete A')).toBeInTheDocument()
  })

  it('shows the configured aggregation on group rows and leaves non-aggregated columns blank', () => {
    render(
      <GroupedDataTable
        rows={rows}
        columns={columns}
        groupBy="tienda"
        aggregations={[{ field: 'valorTotalOrden', fn: 'sum' }]}
      />,
    )

    const subaRow = screen
      .getByText('SOD SUBA (2)')
      .closest('.MuiDataGrid-row') as HTMLElement

    expect(
      within(subaRow).getByText(String(119600 + 135000)),
    ).toBeInTheDocument()
    expect(
      subaRow.querySelector('[data-field="cantidadOrden"]'),
    ).toHaveTextContent('')
  })

  it('shows the group count and a dataset-wide grand total in the footer, regardless of collapse state', () => {
    render(
      <GroupedDataTable
        rows={rows}
        columns={columns}
        groupBy="tienda"
        aggregations={[{ field: 'valorTotalOrden', fn: 'sum' }]}
      />,
    )

    // Both groups start collapsed — the totals below still cover every row.
    expect(screen.getByText('Total de grupos: 2')).toBeInTheDocument()
    expect(
      screen.getByText(`Total Valor Total Orden: ${119600 + 135000 + 135000}`),
    ).toBeInTheDocument()
  })

  it("renders no checkboxes by default, matching MUI X Premium's own row-grouping demos", () => {
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('when checkboxSelection is explicitly opted into, does not render a functional checkbox on group rows, and keeps it on child rows', () => {
    render(
      <GroupedDataTable
        rows={rows}
        columns={columns}
        groupBy="tienda"
        checkboxSelection
      />,
    )

    const subaGroupRow = screen
      .getByText('SOD SUBA (2)')
      .closest('.MuiDataGrid-row') as HTMLElement
    // The visual hide is CSS (`visibility: hidden` on `.MuiDataGrid-cellCheckbox`),
    // which this project's mocked `.css` imports in Jest can't exercise —
    // `disabled` is the DOM-level proxy jsdom can actually see; see
    // GroupedDataTable.css.
    expect(within(subaGroupRow).getByRole('checkbox')).toBeDisabled()

    fireEvent.click(screen.getAllByLabelText('Expandir grupo')[0])
    const childRow = screen
      .getByText('Tapete A')
      .closest('.MuiDataGrid-row') as HTMLElement
    expect(within(childRow).getByRole('checkbox')).not.toBeDisabled()
  })

  describe('column header sort', () => {
    // Deliberately not already alphabetical in either direction, and not a
    // 2-item set either — with only 2 distinct values, the original
    // (first-appearance) order is indistinguishable from one of the two
    // sorted directions, which would hide a "third click doesn't actually
    // clear the sort" bug.
    const unsortedRows: DemoRow[] = [
      {
        id: '1',
        tienda: 'B Tienda',
        producto: 'Z',
        cantidadOrden: 1,
        valorTotalOrden: 1,
      },
      {
        id: '2',
        tienda: 'A Tienda',
        producto: 'Y',
        cantidadOrden: 2,
        valorTotalOrden: 2,
      },
      {
        id: '3',
        tienda: 'C Tienda',
        producto: 'X',
        cantidadOrden: 3,
        valorTotalOrden: 3,
      },
    ]

    function tiendaGroupLabels() {
      return screen.getAllByText(/Tienda \(\d\)/).map((el) => el.textContent)
    }

    it('cycles ascending, descending, then back to the original order on repeated clicks, sorting groups by their own groupBy value', () => {
      render(
        <GroupedDataTable
          rows={unsortedRows}
          columns={columns}
          groupBy="tienda"
        />,
      )

      expect(tiendaGroupLabels()).toEqual([
        'B Tienda (1)',
        'A Tienda (1)',
        'C Tienda (1)',
      ])

      const header = screen.getByRole('columnheader', { name: 'Tienda' })

      fireEvent.click(header)
      expect(tiendaGroupLabels()).toEqual([
        'A Tienda (1)',
        'B Tienda (1)',
        'C Tienda (1)',
      ])

      fireEvent.click(header)
      expect(tiendaGroupLabels()).toEqual([
        'C Tienda (1)',
        'B Tienda (1)',
        'A Tienda (1)',
      ])

      fireEvent.click(header)
      expect(tiendaGroupLabels()).toEqual([
        'B Tienda (1)',
        'A Tienda (1)',
        'C Tienda (1)',
      ])
    })

    it('sorts groups by their aggregate when sorting an aggregated column, not alphabetically by the groupBy field', () => {
      render(
        <GroupedDataTable
          rows={rows}
          columns={columns}
          groupBy="tienda"
          aggregations={[{ field: 'valorTotalOrden', fn: 'sum' }]}
        />,
      )

      function sodGroupLabels() {
        return screen.getAllByText(/SOD \w+ \(\d\)/).map((el) => el.textContent)
      }

      const header = screen.getByRole('columnheader', {
        name: /Valor Total Orden/,
      })

      // SOD CEDRITOS' sum (135000) is lower than SOD SUBA's
      // (119600 + 135000 = 254600) — alphabetically it would be the other
      // way around, which is how this tells "sorted by aggregate" apart from
      // "sorted alphabetically by groupBy value" (the previous test).
      fireEvent.click(header)
      expect(sodGroupLabels()).toEqual(['SOD CEDRITOS (1)', 'SOD SUBA (2)'])

      fireEvent.click(header)
      expect(sodGroupLabels()).toEqual(['SOD SUBA (2)', 'SOD CEDRITOS (1)'])
    })

    it("sorts a group's own leaf rows by a plain column once expanded, without reordering the groups themselves (no aggregate to sort them by)", () => {
      const leafSortRows: DemoRow[] = [
        {
          id: '1',
          tienda: 'SOD SUBA',
          producto: 'Tapete Z',
          cantidadOrden: 4,
          valorTotalOrden: 1,
        },
        {
          id: '2',
          tienda: 'SOD SUBA',
          producto: 'Tapete A',
          cantidadOrden: 6,
          valorTotalOrden: 2,
        },
      ]
      render(
        <GroupedDataTable
          rows={leafSortRows}
          columns={columns}
          groupBy="tienda"
        />,
      )

      fireEvent.click(screen.getByRole('columnheader', { name: 'Producto' }))
      fireEvent.click(screen.getByLabelText('Expandir grupo'))

      expect(
        screen.getAllByText(/^Tapete /).map((el) => el.textContent),
      ).toEqual(['Tapete A', 'Tapete Z'])
    })

    it("shows the grid's own sort direction arrow on a sorted header, in a colour that's actually visible", () => {
      // Regression test: this project's theme (src/theme/index.ts) gives
      // MUI `IconButton`'s default `color="default"` a literal
      // `main: '#ffffff'` (`palette.default`, added for
      // `<Button color="default">`, not icon buttons) — the grid's own sort
      // button doesn't set its own `color`, so without
      // `slotProps.baseIconButton` forcing `color="inherit"` (see the JSX
      // below `<DataTable>`), the arrow icon renders fully white-on-white:
      // present in the DOM, but invisible. The same pitfall this
      // component's own toolbar filter trigger and aggregation-menu trigger
      // already had to work around, just not reachable at either of those
      // call sites since this one's rendered entirely inside the underlying
      // grid.
      render(
        <GroupedDataTable
          rows={unsortedRows}
          columns={columns}
          groupBy="tienda"
        />,
      )

      const header = screen.getByRole('columnheader', { name: 'Tienda' })
      fireEvent.click(header)

      const sortButton = header.querySelector('.MuiDataGrid-sortButton')
      expect(sortButton).toBeInTheDocument()
      expect(sortButton).toHaveClass('MuiIconButton-colorInherit')
      expect(sortButton).not.toHaveClass('MuiIconButton-colorDefault')
      expect(
        within(sortButton as HTMLElement).getByTestId('ArrowUpwardIcon'),
      ).toBeInTheDocument()

      fireEvent.click(header)
      expect(
        within(sortButton as HTMLElement).getByTestId('ArrowDownwardIcon'),
      ).toBeInTheDocument()
    })
  })

  describe('real Homecenter fixture (docs/Copy of pedidoxtiendas.xlsx, rows 39+)', () => {
    // One row per store→product line, derived from the spreadsheet's own
    // "Codigo Tienda" / "Ean Producto" blocks (32 stores, 1-12 products
    // each, 109 product rows total). `tienda` is the groupBy field.
    const pedidoXTiendasColumns: GridColDef[] = [
      { field: 'tienda', headerName: 'Tienda', flex: 1 },
      { field: 'eanProducto', headerName: 'Ean Producto', flex: 1 },
      {
        field: 'descripcionProducto',
        headerName: 'Descripcion Producto',
        flex: 1.5,
      },
      { field: 'cantidadOrden', headerName: 'Cantidad Orden', type: 'number' },
      {
        field: 'valorTotalOrden',
        headerName: 'Valor Total Orden',
        type: 'number',
      },
    ]

    const pedidoXTiendasRows = [
      {
        id: '10-1',
        tienda: 'SOD SUBA',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '10-2',
        tienda: 'SOD SUBA',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '10-3',
        tienda: 'SOD SUBA',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 2,
        valorUnitario: 28200,
        valorTotalOrden: 56400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '10-4',
        tienda: 'SOD SUBA',
        eanProducto: '7707203668268',
        factory: 'T150500218',
        descripcionProducto: 'JB 3 PIEZAS',
        cantidadOrden: 6,
        valorUnitario: 34600,
        valorTotalOrden: 207600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '11-1',
        tienda: 'SOD CEDRITOS',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '11-2',
        tienda: 'SOD CEDRITOS',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '11-3',
        tienda: 'SOD CEDRITOS',
        eanProducto: '7705666869451',
        factory: 'T2010BOL47',
        descripcionProducto: 'TAPETE BORLIGHT PAMU 120X170',
        cantidadOrden: 2,
        valorUnitario: 176900,
        valorTotalOrden: 353800,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '12-1',
        tienda: 'SOD CAJICA',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 8,
        valorUnitario: 12500,
        valorTotalOrden: 100000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '12-2',
        tienda: 'SOD CAJICA',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '12-3',
        tienda: 'SOD CAJICA',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '12-4',
        tienda: 'SOD CAJICA',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 4,
        valorUnitario: 28200,
        valorTotalOrden: 112800,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '12-5',
        tienda: 'SOD CAJICA',
        eanProducto: '7705666625989',
        factory: 'T2010REV11',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 160X220',
        cantidadOrden: 1,
        valorUnitario: 242200,
        valorTotalOrden: 242200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '12-6',
        tienda: 'SOD CAJICA',
        eanProducto: '7705666787465',
        factory: 'T100500009',
        descripcionProducto: 'GRAMA GOLDEN 750gr 2mx1m',
        cantidadOrden: 4,
        valorUnitario: 81000,
        valorTotalOrden: 324000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '13-1',
        tienda: 'SOD SOACHA',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '13-2',
        tienda: 'SOD SOACHA',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 1,
        valorUnitario: 28200,
        valorTotalOrden: 28200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '15-1',
        tienda: 'SOD MallPlaza NQS',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '15-2',
        tienda: 'SOD MallPlaza NQS',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 1,
        valorUnitario: 28200,
        valorTotalOrden: 28200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '15-3',
        tienda: 'SOD MallPlaza NQS',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '15-4',
        tienda: 'SOD MallPlaza NQS',
        eanProducto: '7705666420386',
        factory: 'T2010SNA05',
        descripcionProducto: 'TAPETE SIENA  GEOMETRIC 120X170',
        cantidadOrden: 3,
        valorUnitario: 210000,
        valorTotalOrden: 630000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '15-5',
        tienda: 'SOD MallPlaza NQS',
        eanProducto: '7705666056523',
        factory: 'T302000003',
        descripcionProducto: 'GR CURLY GRASS 750 gr 2x1m VERDE',
        cantidadOrden: 4,
        valorUnitario: 89000,
        valorTotalOrden: 356000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '17-1',
        tienda: 'SOD NEIVA',
        eanProducto: '7707203668268',
        factory: 'T150500218',
        descripcionProducto: 'JB 3 PIEZAS',
        cantidadOrden: 6,
        valorUnitario: 34600,
        valorTotalOrden: 207600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '18-1',
        tienda: 'SOD VILLAVICENCIO',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '18-2',
        tienda: 'SOD VILLAVICENCIO',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '18-3',
        tienda: 'SOD VILLAVICENCIO',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 1,
        valorUnitario: 28200,
        valorTotalOrden: 28200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '18-4',
        tienda: 'SOD VILLAVICENCIO',
        eanProducto: '7705666906194',
        factory: 'T150501858',
        descripcionProducto: 'JB 2 PZS HABANA TAUPE',
        cantidadOrden: 6,
        valorUnitario: 35300,
        valorTotalOrden: 211800,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '18-5',
        tienda: 'SOD VILLAVICENCIO',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '19-1',
        tienda: 'SOD IBAGUE',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '21-1',
        tienda: 'SOD YOPAL',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '22-1',
        tienda: 'SOD TUNJA',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '22-2',
        tienda: 'SOD TUNJA',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '22-3',
        tienda: 'SOD TUNJA',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '22-4',
        tienda: 'SOD TUNJA',
        eanProducto: '7705666935590',
        factory: 'T2010REV09',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 80X140',
        cantidadOrden: 1,
        valorUnitario: 87400,
        valorTotalOrden: 87400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '23-1',
        tienda: 'SOD TINTAL',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '24-1',
        tienda: 'SOD MOSQUERA',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '24-2',
        tienda: 'SOD MOSQUERA',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 1,
        valorUnitario: 28200,
        valorTotalOrden: 28200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '24-3',
        tienda: 'SOD MOSQUERA',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '31-1',
        tienda: 'SOD CALI NORTE',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 2,
        valorUnitario: 28200,
        valorTotalOrden: 56400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '32-1',
        tienda: 'SOD PALMIRA',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 2,
        valorUnitario: 28200,
        valorTotalOrden: 56400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '33-1',
        tienda: 'SOD TULUA',
        eanProducto: '7705666625989',
        factory: 'T2010REV11',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 160X220',
        cantidadOrden: 1,
        valorUnitario: 242200,
        valorTotalOrden: 242200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '40-1',
        tienda: 'SOD INDUSTRIALES',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '40-2',
        tienda: 'SOD INDUSTRIALES',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '40-3',
        tienda: 'SOD INDUSTRIALES',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '41-1',
        tienda: 'SOD SAN JUAN',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '41-2',
        tienda: 'SOD SAN JUAN',
        eanProducto: '7705666791868',
        factory: 'T2010REV15',
        descripcionProducto: 'TAP REVERSO GEO TAUPE 160X220',
        cantidadOrden: 1,
        valorUnitario: 242200,
        valorTotalOrden: 242200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '41-3',
        tienda: 'SOD SAN JUAN',
        eanProducto: '7705666266212',
        factory: 'T2010BOL51',
        descripcionProducto: 'TAPETE BORLIGHT BURSA 160X230',
        cantidadOrden: 4,
        valorUnitario: 317300,
        valorTotalOrden: 1269200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '41-4',
        tienda: 'SOD SAN JUAN',
        eanProducto: '7705666935590',
        factory: 'T2010REV09',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 80X140',
        cantidadOrden: 1,
        valorUnitario: 87400,
        valorTotalOrden: 87400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '42-1',
        tienda: 'SOD BELLO',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '42-2',
        tienda: 'SOD BELLO',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '42-3',
        tienda: 'SOD BELLO',
        eanProducto: '7703670917724',
        factory: 'T150500412',
        descripcionProducto: 'JB 2 PZS CASA BONITA',
        cantidadOrden: 6,
        valorUnitario: 24900,
        valorTotalOrden: 149400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '42-4',
        tienda: 'SOD BELLO',
        eanProducto: '7705666392737',
        factory: 'T2010REV10',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 120X160',
        cantidadOrden: 1,
        valorUnitario: 132600,
        valorTotalOrden: 132600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '43-1',
        tienda: 'SOD MOLINOS',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '44-1',
        tienda: 'SOD ENVIGADO',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '44-2',
        tienda: 'SOD ENVIGADO',
        eanProducto: '7705666031285',
        factory: 'T2010BOL54',
        descripcionProducto: 'TAPETE BORLIGHT SANLI 160X230',
        cantidadOrden: 1,
        valorUnitario: 317300,
        valorTotalOrden: 317300,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '44-3',
        tienda: 'SOD ENVIGADO',
        eanProducto: '7705666261705',
        factory: 'T2010BOL48',
        descripcionProducto: 'TAPETE BORLIGHT PAMU 160X230',
        cantidadOrden: 4,
        valorUnitario: 317300,
        valorTotalOrden: 1269200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '44-4',
        tienda: 'SOD ENVIGADO',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '45-1',
        tienda: 'SOD RIONEGRO',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '45-2',
        tienda: 'SOD RIONEGRO',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '45-3',
        tienda: 'SOD RIONEGRO',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '54-1',
        tienda: 'SOD CARTAGENA',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '54-2',
        tienda: 'SOD CARTAGENA',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '54-3',
        tienda: 'SOD CARTAGENA',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 1,
        valorUnitario: 28200,
        valorTotalOrden: 28200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '55-1',
        tienda: 'SOD VALLEDUPAR',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '56-1',
        tienda: 'SOD MONTERIA',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '56-2',
        tienda: 'SOD MONTERIA',
        eanProducto: '7705666906194',
        factory: 'T150501858',
        descripcionProducto: 'JB 2 PZS HABANA TAUPE',
        cantidadOrden: 6,
        valorUnitario: 35300,
        valorTotalOrden: 211800,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '58-1',
        tienda: 'SOD DORADO',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 16,
        valorUnitario: 12500,
        valorTotalOrden: 200000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '58-2',
        tienda: 'SOD DORADO',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '58-3',
        tienda: 'SOD DORADO',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '58-4',
        tienda: 'SOD DORADO',
        eanProducto: '7703670917724',
        factory: 'T150500412',
        descripcionProducto: 'JB 2 PZS CASA BONITA',
        cantidadOrden: 6,
        valorUnitario: 24900,
        valorTotalOrden: 149400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '58-5',
        tienda: 'SOD DORADO',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 1,
        valorUnitario: 28200,
        valorTotalOrden: 28200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '58-6',
        tienda: 'SOD DORADO',
        eanProducto: '7705666906194',
        factory: 'T150501858',
        descripcionProducto: 'JB 2 PZS HABANA TAUPE',
        cantidadOrden: 6,
        valorUnitario: 35300,
        valorTotalOrden: 211800,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '59-1',
        tienda: 'SOD CARTAGENA SANFERNANDO',
        eanProducto: '7705666625989',
        factory: 'T2010REV11',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 160X220',
        cantidadOrden: 1,
        valorUnitario: 242200,
        valorTotalOrden: 242200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-1',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 8,
        valorUnitario: 12500,
        valorTotalOrden: 100000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-2',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 4,
        valorUnitario: 28200,
        valorTotalOrden: 112800,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-3',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666031285',
        factory: 'T2010BOL54',
        descripcionProducto: 'TAPETE BORLIGHT SANLI 160X230',
        cantidadOrden: 3,
        valorUnitario: 317300,
        valorTotalOrden: 951900,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-4',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666935590',
        factory: 'T2010REV09',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 80X140',
        cantidadOrden: 3,
        valorUnitario: 87400,
        valorTotalOrden: 262200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-5',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666261484',
        factory: 'T2005INN14',
        descripcionProducto: 'TAP INFANTIL SURTIDO',
        cantidadOrden: 4,
        valorUnitario: 68800,
        valorTotalOrden: 275200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-6',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666652596',
        factory: 'T2010BOL50',
        descripcionProducto: 'TAPETE BORLIGHT BURSA 120X170',
        cantidadOrden: 4,
        valorUnitario: 176900,
        valorTotalOrden: 707600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-7',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666653791',
        factory: 'T2005MAZ01',
        descripcionProducto: 'TAPETE MULTIUSOS AZUL 50X80 ',
        cantidadOrden: 4,
        valorUnitario: 19600,
        valorTotalOrden: 78400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-8',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666597095',
        factory: 'T2010REV13',
        descripcionProducto: 'TAP REVERSO GEO TAUPE 80X140',
        cantidadOrden: 1,
        valorUnitario: 87400,
        valorTotalOrden: 87400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '60-9',
        tienda: 'SOD PEREIRA',
        eanProducto: '7705666935927',
        factory: 'T2010BOL53',
        descripcionProducto: 'TAPETE BORLIGHT SANLI 120X170',
        cantidadOrden: 2,
        valorUnitario: 176900,
        valorTotalOrden: 353800,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '65-1',
        tienda: 'SOD MANIZALES',
        eanProducto: '7705666261705',
        factory: 'T2010BOL48',
        descripcionProducto: 'TAPETE BORLIGHT PAMU 160X230',
        cantidadOrden: 9,
        valorUnitario: 317300,
        valorTotalOrden: 2855700,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '65-2',
        tienda: 'SOD MANIZALES',
        eanProducto: '7705666935590',
        factory: 'T2010REV09',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 80X140',
        cantidadOrden: 3,
        valorUnitario: 87400,
        valorTotalOrden: 262200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-1',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-2',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 8,
        valorUnitario: 29900,
        valorTotalOrden: 239200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-3',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-4',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 3,
        valorUnitario: 28200,
        valorTotalOrden: 84600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-5',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666791868',
        factory: 'T2010REV15',
        descripcionProducto: 'TAP REVERSO GEO TAUPE 160X220',
        cantidadOrden: 1,
        valorUnitario: 242200,
        valorTotalOrden: 242200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-6',
        tienda: 'SOD CALLE 80',
        eanProducto: '7707203668268',
        factory: 'T150500218',
        descripcionProducto: 'JB 3 PIEZAS',
        cantidadOrden: 6,
        valorUnitario: 34600,
        valorTotalOrden: 207600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-7',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666625989',
        factory: 'T2010REV11',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 160X220',
        cantidadOrden: 1,
        valorUnitario: 242200,
        valorTotalOrden: 242200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-8',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666031285',
        factory: 'T2010BOL54',
        descripcionProducto: 'TAPETE BORLIGHT SANLI 160X230',
        cantidadOrden: 3,
        valorUnitario: 317300,
        valorTotalOrden: 951900,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-9',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666261705',
        factory: 'T2010BOL48',
        descripcionProducto: 'TAPETE BORLIGHT PAMU 160X230',
        cantidadOrden: 3,
        valorUnitario: 317300,
        valorTotalOrden: 951900,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-10',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666266212',
        factory: 'T2010BOL51',
        descripcionProducto: 'TAPETE BORLIGHT BURSA 160X230',
        cantidadOrden: 3,
        valorUnitario: 317300,
        valorTotalOrden: 951900,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '68-11',
        tienda: 'SOD CALLE 80',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '70-1',
        tienda: 'SOD NORTE',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 4,
        valorUnitario: 12500,
        valorTotalOrden: 50000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '70-2',
        tienda: 'SOD NORTE',
        eanProducto: '7703670917724',
        factory: 'T150500412',
        descripcionProducto: 'JB 2 PZS CASA BONITA',
        cantidadOrden: 6,
        valorUnitario: 24900,
        valorTotalOrden: 149400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '70-3',
        tienda: 'SOD NORTE',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 1,
        valorUnitario: 28200,
        valorTotalOrden: 28200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '70-4',
        tienda: 'SOD NORTE',
        eanProducto: '7705666906194',
        factory: 'T150501858',
        descripcionProducto: 'JB 2 PZS HABANA TAUPE',
        cantidadOrden: 6,
        valorUnitario: 35300,
        valorTotalOrden: 211800,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '70-5',
        tienda: 'SOD NORTE',
        eanProducto: '7705666625989',
        factory: 'T2010REV11',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 160X220',
        cantidadOrden: 1,
        valorUnitario: 242200,
        valorTotalOrden: 242200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '70-6',
        tienda: 'SOD NORTE',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '80-1',
        tienda: 'SOD SUR',
        eanProducto: '7705666906996',
        factory: 'T200500010',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X110',
        cantidadOrden: 4,
        valorUnitario: 29900,
        valorTotalOrden: 119600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '80-2',
        tienda: 'SOD SUR',
        eanProducto: '7705666112779',
        factory: 'T2005MFG01',
        descripcionProducto: 'TAPETE MULTIUSOS 50X80 FIGURAS GRIS',
        cantidadOrden: 6,
        valorUnitario: 22500,
        valorTotalOrden: 135000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '80-3',
        tienda: 'SOD SUR',
        eanProducto: '7705666555866',
        factory: 'T150501844',
        descripcionProducto: 'JB 2PZS RIO GRIS',
        cantidadOrden: 1,
        valorUnitario: 28200,
        valorTotalOrden: 28200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '80-4',
        tienda: 'SOD SUR',
        eanProducto: '7705666031285',
        factory: 'T2010BOL54',
        descripcionProducto: 'TAPETE BORLIGHT SANLI 160X230',
        cantidadOrden: 1,
        valorUnitario: 317300,
        valorTotalOrden: 317300,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '80-5',
        tienda: 'SOD SUR',
        eanProducto: '7705666266212',
        factory: 'T2010BOL51',
        descripcionProducto: 'TAPETE BORLIGHT BURSA 160X230',
        cantidadOrden: 1,
        valorUnitario: 317300,
        valorTotalOrden: 317300,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '80-6',
        tienda: 'SOD SUR',
        eanProducto: '7705666905982',
        factory: 'T200500011',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 60X150',
        cantidadOrden: 4,
        valorUnitario: 40900,
        valorTotalOrden: 163600,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '95-1',
        tienda: 'SOD BUCARAMANGA',
        eanProducto: '7705666884140',
        factory: 'T200500009',
        descripcionProducto: 'TAP CUPERZ RIO GRIS 40X60',
        cantidadOrden: 8,
        valorUnitario: 12500,
        valorTotalOrden: 100000,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '95-2',
        tienda: 'SOD BUCARAMANGA',
        eanProducto: '7705666791868',
        factory: 'T2010REV15',
        descripcionProducto: 'TAP REVERSO GEO TAUPE 160X220',
        cantidadOrden: 1,
        valorUnitario: 242200,
        valorTotalOrden: 242200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '95-3',
        tienda: 'SOD BUCARAMANGA',
        eanProducto: '7705666935590',
        factory: 'T2010REV09',
        descripcionProducto: 'TAP REVERSO ESPINA TAUPE 80X140',
        cantidadOrden: 1,
        valorUnitario: 87400,
        valorTotalOrden: 87400,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
      {
        id: '95-4',
        tienda: 'SOD BUCARAMANGA',
        eanProducto: '7705666261484',
        factory: 'T2005INN14',
        descripcionProducto: 'TAP INFANTIL SURTIDO',
        cantidadOrden: 4,
        valorUnitario: 68800,
        valorTotalOrden: 275200,
        cantidadDespacho: 0,
        valorTotalDespacho: 0,
      },
    ]

    // Each store's own precomputed "Valor Total Orden" total from the
    // spreadsheet (row directly under "Codigo Tienda"), used to verify
    // `GroupedDataTable`'s `sum` aggregation reproduces it exactly.
    const expectedStoreTotals: Record<string, number> = {
      'SOD SUBA': 518600,
      'SOD CEDRITOS': 652400,
      'SOD CAJICA': 1033600,
      'SOD SOACHA': 163200,
      'SOD MallPlaza NQS': 1227800,
      'SOD NEIVA': 207600,
      'SOD VILLAVICENCIO': 588600,
      'SOD IBAGUE': 50000,
      'SOD YOPAL': 50000,
      'SOD TUNJA': 420600,
      'SOD TINTAL': 119600,
      'SOD MOSQUERA': 326800,
      'SOD CALI NORTE': 56400,
      'SOD PALMIRA': 56400,
      'SOD TULUA': 242200,
      'SOD INDUSTRIALES': 304600,
      'SOD SAN JUAN': 1648800,
      'SOD BELLO': 451600,
      'SOD MOLINOS': 135000,
      'SOD ENVIGADO': 1800100,
      'SOD RIONEGRO': 304600,
      'SOD CARTAGENA': 282800,
      'SOD VALLEDUPAR': 135000,
      'SOD MONTERIA': 261800,
      'SOD DORADO': 844000,
      'SOD CARTAGENA SANFERNANDO': 242200,
      'SOD PEREIRA': 2929300,
      'SOD MANIZALES': 3117900,
      'SOD CALLE 80': 4220100,
      'SOD NORTE': 845200,
      'SOD SUR': 1081000,
      'SOD BUCARAMANGA': 704800,
    }

    it("reproduces every store's precomputed order total exactly, plus the grand total", () => {
      render(
        <GroupedDataTable
          rows={pedidoXTiendasRows}
          columns={pedidoXTiendasColumns}
          groupBy="tienda"
          aggregations={[{ field: 'valorTotalOrden', fn: 'sum' }]}
          // All 32 groups on one page — DataTable's own default page size
          // is 10.
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        />,
      )

      const storeNames = Object.keys(expectedStoreTotals)
      expect(storeNames).toHaveLength(32)

      expect(
        screen.getByText(`Total de grupos: ${storeNames.length}`),
      ).toBeInTheDocument()

      for (const tienda of storeNames) {
        const productCount = pedidoXTiendasRows.filter(
          (row) => row.tienda === tienda,
        ).length
        const groupRow = screen
          .getByText(`${tienda} (${productCount})`)
          .closest('.MuiDataGrid-row') as HTMLElement

        expect(
          within(groupRow).getByText(String(expectedStoreTotals[tienda])),
        ).toBeInTheDocument()
      }

      const grandTotal = Object.values(expectedStoreTotals).reduce(
        (total, value) => total + value,
        0,
      )
      expect(
        screen.getByText(`Total Valor Total Orden: ${grandTotal}`),
      ).toBeInTheDocument()
    })
  })
})

describe('GroupedDataTable — multi-level grouping', () => {
  interface NestedRow {
    id: string
    tienda: string
    contenedor: string
    producto: string
    cantidad: number
  }

  const nestedColumns: GridColDef[] = [
    { field: 'tienda', headerName: 'Tienda', flex: 1 },
    { field: 'contenedor', headerName: 'Contenedor', flex: 1 },
    { field: 'producto', headerName: 'Producto', flex: 1 },
    { field: 'cantidad', headerName: 'Cantidad', type: 'number' },
  ]

  // Tienda A/C1 and Tienda B/C1 share the literal container name "C1" on
  // purpose — exercises that collapse state and group identity are keyed by
  // the full path, not just the innermost value.
  const nestedRows: NestedRow[] = [
    {
      id: '1',
      tienda: 'Tienda A',
      contenedor: 'C1',
      producto: 'P1',
      cantidad: 2,
    },
    {
      id: '2',
      tienda: 'Tienda A',
      contenedor: 'C1',
      producto: 'P2',
      cantidad: 3,
    },
    {
      id: '3',
      tienda: 'Tienda A',
      contenedor: 'C2',
      producto: 'P3',
      cantidad: 5,
    },
    {
      id: '4',
      tienda: 'Tienda B',
      contenedor: 'C1',
      producto: 'P4',
      cantidad: 7,
    },
  ]

  it('nests a group row per groupBy field, with a recursive leaf count at every level', () => {
    render(
      <GroupedDataTable
        rows={nestedRows}
        columns={nestedColumns}
        groupBy={['tienda', 'contenedor']}
      />,
    )

    // Top level only — Tienda A's count (3) covers both its containers.
    expect(screen.getByText('Tienda A (3)')).toBeInTheDocument()
    expect(screen.getByText('Tienda B (1)')).toBeInTheDocument()
    expect(screen.queryByText('C1 (2)')).not.toBeInTheDocument()
    expect(screen.queryByText('P1')).not.toBeInTheDocument()

    const tiendaARow = screen
      .getByText('Tienda A (3)')
      .closest('.MuiDataGrid-row') as HTMLElement
    fireEvent.click(within(tiendaARow).getByLabelText('Expandir grupo'))

    // Tienda A's own two containers are now visible; Tienda B's "C1" is
    // not, since Tienda B is still collapsed.
    expect(screen.getByText('C1 (2)')).toBeInTheDocument()
    expect(screen.getByText('C2 (1)')).toBeInTheDocument()
    expect(screen.queryByText('C1 (1)')).not.toBeInTheDocument()
    expect(screen.queryByText('P1')).not.toBeInTheDocument()
  })

  it('keeps same-named containers under different stores independently collapsible', () => {
    render(
      <GroupedDataTable
        rows={nestedRows}
        columns={nestedColumns}
        groupBy={['tienda', 'contenedor']}
      />,
    )

    // Re-queried fresh right before each click rather than held across
    // state-changing actions — expanding a group inserts rows, and MUI's
    // row virtualization doesn't guarantee a previously-found element stays
    // attached once the row list shifts under it.
    const groupRow = (text: string) =>
      screen.getByText(text).closest('.MuiDataGrid-row') as HTMLElement

    fireEvent.click(
      within(groupRow('Tienda A (3)')).getByLabelText('Expandir grupo'),
    )
    fireEvent.click(
      within(groupRow('Tienda B (1)')).getByLabelText('Expandir grupo'),
    )

    // Both stores' own "C1" are now visible as sibling group rows with
    // different counts (2 vs 1) — not merged into one node.
    expect(screen.getByText('C1 (2)')).toBeInTheDocument()
    expect(screen.getByText('C1 (1)')).toBeInTheDocument()

    fireEvent.click(within(groupRow('C1 (2)')).getByLabelText('Expandir grupo'))

    expect(screen.getByText('P1')).toBeInTheDocument()
    expect(screen.getByText('P2')).toBeInTheDocument()
    // Tienda B's own C1 is still collapsed — expanding Tienda A's C1 didn't
    // affect it even though both nodes are labeled "C1".
    expect(screen.queryByText('P4')).not.toBeInTheDocument()
  })
})

describe('GroupedDataTable — expand-all / collapse-all', () => {
  interface ExpandCollapseRow {
    id: string
    tienda: string
    producto: string
  }

  const expandCollapseColumns: GridColDef[] = [
    { field: 'tienda', headerName: 'Tienda', flex: 1 },
    { field: 'producto', headerName: 'Producto', flex: 1 },
  ]

  const expandCollapseRows: ExpandCollapseRow[] = [
    { id: '1', tienda: 'SOD SUBA', producto: 'Tapete A' },
    { id: '2', tienda: 'SOD CEDRITOS', producto: 'Tapete B' },
  ]

  it('expands every group at once, and collapses every group at once', () => {
    render(
      <GroupedDataTable
        rows={expandCollapseRows}
        columns={expandCollapseColumns}
        groupBy="tienda"
      />,
    )

    expect(screen.queryByText('Tapete A')).not.toBeInTheDocument()
    expect(screen.queryByText('Tapete B')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Expandir todos los grupos'))

    expect(screen.getByText('Tapete A')).toBeInTheDocument()
    expect(screen.getByText('Tapete B')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Contraer todos los grupos'))

    expect(screen.queryByText('Tapete A')).not.toBeInTheDocument()
    expect(screen.queryByText('Tapete B')).not.toBeInTheDocument()
  })

  it('hides the expand-all/collapse-all toggle when there are no groups', () => {
    render(
      <GroupedDataTable
        rows={[]}
        columns={expandCollapseColumns}
        groupBy="tienda"
      />,
    )

    expect(
      screen.queryByLabelText('Expandir todos los grupos'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Contraer todos los grupos'),
    ).not.toBeInTheDocument()
  })
})

describe('GroupedDataTable — aggregationPosition', () => {
  interface FooterPositionRow {
    id: string
    tienda: string
    producto: string
    valorTotalOrden: number
  }

  const footerPositionColumns: GridColDef[] = [
    { field: 'tienda', headerName: 'Tienda', flex: 1 },
    { field: 'producto', headerName: 'Producto', flex: 1 },
    {
      field: 'valorTotalOrden',
      headerName: 'Valor Total Orden',
      type: 'number',
    },
  ]

  const footerPositionRows: FooterPositionRow[] = [
    {
      id: '1',
      tienda: 'SOD SUBA',
      producto: 'Tapete A',
      valorTotalOrden: 119600,
    },
    {
      id: '2',
      tienda: 'SOD SUBA',
      producto: 'Tapete B',
      valorTotalOrden: 135000,
    },
  ]

  it('moves the aggregate off the group row and onto its own subtotal row when set to "footer"', () => {
    render(
      <GroupedDataTable
        rows={footerPositionRows}
        columns={footerPositionColumns}
        groupBy="tienda"
        aggregations={[{ field: 'valorTotalOrden', fn: 'sum' }]}
        aggregationPosition="footer"
      />,
    )

    const groupRow = screen
      .getByText('SOD SUBA (2)')
      .closest('.MuiDataGrid-row') as HTMLElement
    expect(
      groupRow.querySelector('[data-field="valorTotalOrden"]'),
    ).toHaveTextContent('')

    // The subtotal row is visible even though the group itself is still
    // collapsed.
    const subtotalLabel = screen.getByText('Subtotal SOD SUBA')
    const subtotalRow = subtotalLabel.closest('.MuiDataGrid-row') as HTMLElement
    expect(
      within(subtotalRow).getByText(String(119600 + 135000)),
    ).toBeInTheDocument()
  })
})

describe('GroupedDataTable — custom aggregationFunctions', () => {
  interface CustomAggregationRow {
    id: string
    tienda: string
    producto: string
    valorTotalOrden: number
  }

  const customAggregationColumns: GridColDef[] = [
    { field: 'tienda', headerName: 'Tienda', flex: 1 },
    { field: 'producto', headerName: 'Producto', flex: 1 },
    {
      field: 'valorTotalOrden',
      headerName: 'Valor Total Orden',
      type: 'number',
    },
  ]

  const customAggregationRows: CustomAggregationRow[] = [
    {
      id: '1',
      tienda: 'SOD SUBA',
      producto: 'Tapete A',
      valorTotalOrden: 119600,
    },
    {
      id: '2',
      tienda: 'SOD SUBA',
      producto: 'Tapete B',
      valorTotalOrden: 135000,
    },
    {
      id: '3',
      tienda: 'SOD CEDRITOS',
      producto: 'Tapete C',
      valorTotalOrden: 135000,
    },
  ]

  function median(values: ReadonlyArray<number>): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2
  }

  it('uses a consumer-provided aggregation function referenced by name', () => {
    render(
      <GroupedDataTable
        rows={customAggregationRows}
        columns={customAggregationColumns}
        groupBy="tienda"
        aggregations={[{ field: 'valorTotalOrden', fn: 'median' }]}
        aggregationFunctions={{ median }}
      />,
    )

    // median([119600, 135000]) = 127300 (even count, average of the two
    // middle values); median([119600, 135000, 135000]) = 135000 (odd count,
    // the middle value once sorted) — hardcoded rather than computed via
    // `median` itself, so this doesn't just check the function against
    // itself.
    const subaRow = screen
      .getByText('SOD SUBA (2)')
      .closest('.MuiDataGrid-row') as HTMLElement
    expect(within(subaRow).getByText('127300')).toBeInTheDocument()

    expect(
      screen.getByText('Total Valor Total Orden: 135000'),
    ).toBeInTheDocument()
  })
})

describe('GroupedDataTable — aggregation header menu', () => {
  interface AggregationMenuRow {
    id: string
    tienda: string
    producto: string
    valorTotalOrden: number
    cantidadOrden: number
  }

  const aggregationMenuColumns: GridColDef[] = [
    { field: 'tienda', headerName: 'Tienda', flex: 1 },
    { field: 'producto', headerName: 'Producto', flex: 1 },
    {
      field: 'valorTotalOrden',
      headerName: 'Valor Total Orden',
      type: 'number',
    },
    { field: 'cantidadOrden', headerName: 'Cantidad Orden', type: 'number' },
  ]

  const aggregationMenuRows: AggregationMenuRow[] = [
    {
      id: '1',
      tienda: 'SOD SUBA',
      producto: 'Tapete A',
      valorTotalOrden: 100,
      cantidadOrden: 4,
    },
    {
      id: '2',
      tienda: 'SOD SUBA',
      producto: 'Tapete B',
      valorTotalOrden: 200,
      cantidadOrden: 6,
    },
  ]

  it("shows the active function as a small label under the column name, matching MUI X Premium's own screenshot", () => {
    render(
      <GroupedDataTable
        rows={aggregationMenuRows}
        columns={aggregationMenuColumns}
        groupBy="tienda"
        aggregations={[{ field: 'valorTotalOrden', fn: 'sum' }]}
      />,
    )

    const header = screen.getByRole('columnheader', {
      name: /Valor Total Orden/,
    })
    expect(within(header).getByText('sum')).toBeInTheDocument()

    // An unaggregated numeric column gets no such label.
    expect(
      within(
        screen.getByRole('columnheader', { name: /Cantidad Orden/ }),
      ).queryByText('sum'),
    ).not.toBeInTheDocument()
  })

  it('only offers the aggregation menu trigger on numeric, non-groupBy columns', () => {
    render(
      <GroupedDataTable
        rows={aggregationMenuRows}
        columns={aggregationMenuColumns}
        groupBy="tienda"
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Opciones de agregación de "Valor Total Orden"',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Opciones de agregación de "Cantidad Orden"',
      }),
    ).toBeInTheDocument()

    // "Tienda" (the groupBy field) and "Producto" (not numeric) get none.
    expect(
      screen.queryByRole('button', {
        name: 'Opciones de agregación de "Tienda"',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Opciones de agregación de "Producto"',
      }),
    ).not.toBeInTheDocument()
  })

  it("lets the user change a column's aggregation function from its header menu, live-updating group rows and the grand total", async () => {
    const user = userEvent.setup()
    render(
      <GroupedDataTable
        rows={aggregationMenuRows}
        columns={aggregationMenuColumns}
        groupBy="tienda"
        aggregations={[{ field: 'valorTotalOrden', fn: 'sum' }]}
      />,
    )

    const subaRow = screen
      .getByText('SOD SUBA (2)')
      .closest('.MuiDataGrid-row') as HTMLElement
    expect(within(subaRow).getByText('300')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Opciones de agregación de "Valor Total Orden"',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'avg' }))

    expect(
      within(
        screen.getByRole('columnheader', { name: /Valor Total Orden/ }),
      ).getByText('avg'),
    ).toBeInTheDocument()
    expect(within(subaRow).getByText('150')).toBeInTheDocument()
    expect(screen.getByText('Total Valor Total Orden: 150')).toBeInTheDocument()
  })

  it('lets the user turn aggregation on for a previously unaggregated column, and off again via "Sin agregación"', async () => {
    const user = userEvent.setup()
    render(
      <GroupedDataTable
        rows={aggregationMenuRows}
        columns={aggregationMenuColumns}
        groupBy="tienda"
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Opciones de agregación de "Cantidad Orden"',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'sum' }))

    const subaRow = screen
      .getByText('SOD SUBA (2)')
      .closest('.MuiDataGrid-row') as HTMLElement
    expect(within(subaRow).getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Total Cantidad Orden: 10')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Opciones de agregación de "Cantidad Orden"',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Sin agregación' }))

    expect(
      within(
        screen.getByRole('columnheader', { name: /Cantidad Orden/ }),
      ).queryByText('sum'),
    ).not.toBeInTheDocument()
    expect(
      subaRow.querySelector('[data-field="cantidadOrden"]'),
    ).toHaveTextContent('')
    expect(screen.queryByText(/Total Cantidad Orden/)).not.toBeInTheDocument()
  })

  it('becomes a real controlled component once onAggregationsChange is passed — it reports a selection but does not apply it on its own', async () => {
    const user = userEvent.setup()
    const handleAggregationsChange = jest.fn()

    render(
      <GroupedDataTable
        rows={aggregationMenuRows}
        columns={aggregationMenuColumns}
        groupBy="tienda"
        onAggregationsChange={handleAggregationsChange}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Opciones de agregación de "Valor Total Orden"',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'max' }))

    expect(handleAggregationsChange).toHaveBeenCalledWith([
      { field: 'valorTotalOrden', fn: 'max' },
    ])
    // Nothing fed that reported model back in as the `aggregations` prop,
    // so — same as any other controlled React input — the header doesn't
    // show it on its own.
    expect(
      within(
        screen.getByRole('columnheader', { name: /Valor Total Orden/ }),
      ).queryByText('max'),
    ).not.toBeInTheDocument()
  })

  function ControlledAggregationsHarness({
    rows: harnessRows,
    columns: harnessColumns,
  }: {
    rows: ReadonlyArray<AggregationMenuRow>
    columns: ReadonlyArray<GridColDef>
  }) {
    const [aggregations, setAggregations] = useState<
      Array<{ field: string; fn: string }>
    >([])
    return (
      <GroupedDataTable
        rows={harnessRows as Array<AggregationMenuRow>}
        columns={harnessColumns as Array<GridColDef>}
        groupBy="tienda"
        aggregations={aggregations}
        onAggregationsChange={setAggregations}
      />
    )
  }

  it('round-trips through a consumer-owned aggregations state once wired up as a controlled prop', async () => {
    const user = userEvent.setup()
    render(
      <ControlledAggregationsHarness
        rows={aggregationMenuRows}
        columns={aggregationMenuColumns}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Opciones de agregación de "Valor Total Orden"',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'max' }))

    expect(
      within(
        screen.getByRole('columnheader', { name: /Valor Total Orden/ }),
      ).getByText('max'),
    ).toBeInTheDocument()
  })
})

describe('GroupedDataTable — pagination counts only top-level groups', () => {
  interface PaginationRow {
    id: string
    tienda: string
    producto: string
  }

  const paginationColumns: GridColDef[] = [
    { field: 'tienda', headerName: 'Tienda', flex: 1 },
    { field: 'producto', headerName: 'Producto', flex: 1 },
  ]

  // Tienda A (3 products), Tienda B (2), Tienda C (1) — 3 top-level groups,
  // 6 leaf rows total.
  const paginationRows: PaginationRow[] = [
    { id: '1', tienda: 'Tienda A', producto: 'P1' },
    { id: '2', tienda: 'Tienda A', producto: 'P2' },
    { id: '3', tienda: 'Tienda A', producto: 'P3' },
    { id: '4', tienda: 'Tienda B', producto: 'P4' },
    { id: '5', tienda: 'Tienda B', producto: 'P5' },
    { id: '6', tienda: 'Tienda C', producto: 'P6' },
  ]

  it('keeps every other top-level group on the page once one is expanded, instead of its children eating the page budget', () => {
    render(
      <GroupedDataTable
        rows={paginationRows}
        columns={paginationColumns}
        groupBy="tienda"
        initialState={{ pagination: { paginationModel: { pageSize: 2 } } }}
        pageSizeOptions={[2, 10]}
      />,
    )

    // Page 1 of a 2-per-page split over 3 top-level groups: A and B, not C.
    expect(screen.getByText('Tienda A (3)')).toBeInTheDocument()
    expect(screen.getByText('Tienda B (2)')).toBeInTheDocument()
    expect(screen.queryByText('Tienda C (1)')).not.toBeInTheDocument()

    const tiendaARow = screen
      .getByText('Tienda A (3)')
      .closest('.MuiDataGrid-row') as HTMLElement
    fireEvent.click(within(tiendaARow).getByLabelText('Expandir grupo'))

    // All 3 of Tienda A's children are now visible — before this fix, 3
    // additional flattened rows would have pushed Tienda B off a
    // pageSize-2 page. It must still be here.
    expect(screen.getByText('P1')).toBeInTheDocument()
    expect(screen.getByText('P2')).toBeInTheDocument()
    expect(screen.getByText('P3')).toBeInTheDocument()
    expect(screen.getByText('Tienda B (2)')).toBeInTheDocument()
    expect(screen.queryByText('Tienda C (1)')).not.toBeInTheDocument()
  })

  it('bases the page count on the top-level group count, unaffected by expand state', () => {
    render(
      <GroupedDataTable
        rows={paginationRows}
        columns={paginationColumns}
        groupBy="tienda"
        initialState={{ pagination: { paginationModel: { pageSize: 2 } } }}
        pageSizeOptions={[2, 10]}
      />,
    )

    const tiendaARow = screen
      .getByText('Tienda A (3)')
      .closest('.MuiDataGrid-row') as HTMLElement
    fireEvent.click(within(tiendaARow).getByLabelText('Expandir grupo'))

    // 3 top-level groups over a page size of 2 is 2 pages, regardless of
    // how many leaf rows are currently expanded into view.
    fireEvent.click(screen.getByLabelText('Go to next page'))

    expect(screen.getByText('Tienda C (1)')).toBeInTheDocument()
    expect(screen.queryByText('Tienda A (3)')).not.toBeInTheDocument()
    expect(screen.queryByText('Tienda B (2)')).not.toBeInTheDocument()
  })
})

describe('GroupedDataTable — actions column', () => {
  interface ActionsRow {
    id: string
    tienda: string
    producto: string
  }

  // `getActions` branches on row kind itself, via the exported `isGroupRow`
  // guard — GroupedDataTable never inspects or touches an `actions`-type
  // column's own rendering (see `toGroupAwareColumn`). Each action's
  // `onClick` alerts the specific row it was called for, by that row's own
  // name — `group.groupValue` for the group action, `producto` for the
  // leaf action — not a fixed string, so a wrong/stale row can't slip past
  // a test that only checks the action ran at all.
  const actionsColumns: GridColDef[] = [
    { field: 'tienda', headerName: 'Tienda', flex: 1 },
    { field: 'producto', headerName: 'Producto', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      getActions: (params) =>
        isGroupRow(params.row)
          ? [
              <GridActionsCellItem
                key="maximus"
                icon={<span />}
                label="Maximus"
                onClick={() => alert(`Maximus: ${params.row.groupValue}`)}
              />,
            ]
          : [
              <GridActionsCellItem
                key="ver-detalle"
                icon={<span />}
                label="Ver detalle"
                onClick={() =>
                  alert(`Ver detalle: ${(params.row as ActionsRow).producto}`)
                }
              />,
            ],
    },
  ]

  const actionsRows: ActionsRow[] = [
    { id: '1', tienda: 'SOD SUBA', producto: 'Tapete A' },
    { id: '2', tienda: 'SOD CEDRITOS', producto: 'Tapete B' },
  ]

  // Split across separate tests (rather than one interacting with multiple
  // action buttons) so each only ever fires one MUI ripple-enabled button
  // click — avoids a benign act() warning from one click's ripple animation
  // still settling when a second, unrelated click fires.
  it("runs the group action's handler with that group's own name when clicked", async () => {
    const user = userEvent.setup()
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <GroupedDataTable
        rows={actionsRows}
        columns={actionsColumns}
        groupBy="tienda"
      />,
    )

    const groupRow = screen
      .getByText('SOD SUBA (1)')
      .closest('.MuiDataGrid-row') as HTMLElement
    // `userEvent` (rather than `fireEvent`) properly awaits MUI's ripple
    // animation instead of leaving it to settle after the test moves on.
    await user.click(within(groupRow).getByRole('button', { name: 'Maximus' }))

    expect(alertSpy).toHaveBeenCalledWith('Maximus: SOD SUBA')
    alertSpy.mockRestore()
  })

  it("runs the leaf action's handler with that row's own name when clicked", async () => {
    const user = userEvent.setup()
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <GroupedDataTable
        rows={actionsRows}
        columns={actionsColumns}
        groupBy="tienda"
      />,
    )

    fireEvent.click(screen.getAllByLabelText('Expandir grupo')[0])
    const leafRow = screen
      .getByText('Tapete A')
      .closest('.MuiDataGrid-row') as HTMLElement
    await user.click(
      within(leafRow).getByRole('button', { name: 'Ver detalle' }),
    )

    expect(alertSpy).toHaveBeenCalledWith('Ver detalle: Tapete A')
    alertSpy.mockRestore()
  })

  it('shows the group action only on group rows and the leaf action only on leaf rows', () => {
    render(
      <GroupedDataTable
        rows={actionsRows}
        columns={actionsColumns}
        groupBy="tienda"
      />,
    )

    const groupRow = screen
      .getByText('SOD SUBA (1)')
      .closest('.MuiDataGrid-row') as HTMLElement
    expect(
      within(groupRow).queryByRole('button', { name: 'Ver detalle' }),
    ).not.toBeInTheDocument()

    fireEvent.click(within(groupRow).getByLabelText('Expandir grupo'))
    const leafRow = screen
      .getByText('Tapete A')
      .closest('.MuiDataGrid-row') as HTMLElement
    expect(
      within(leafRow).queryByRole('button', { name: 'Maximus' }),
    ).not.toBeInTheDocument()
  })
})

describe('GroupedDataTable — filtering', () => {
  interface FilterRow {
    id: string
    tienda: string
    producto: string
    valorTotalOrden: number
  }

  const filterColumns: GridColDef[] = [
    { field: 'tienda', headerName: 'Tienda', flex: 1 },
    { field: 'producto', headerName: 'Producto', flex: 1 },
    {
      field: 'valorTotalOrden',
      headerName: 'Valor Total Orden',
      type: 'number',
    },
  ]

  const filterRows: FilterRow[] = [
    {
      id: '1',
      tienda: 'SOD SUBA',
      producto: 'Tapete A',
      valorTotalOrden: 119600,
    },
    {
      id: '2',
      tienda: 'SOD SUBA',
      producto: 'Tapete B',
      valorTotalOrden: 135000,
    },
    {
      id: '3',
      tienda: 'SOD CEDRITOS',
      producto: 'Felpudo C',
      valorTotalOrden: 50000,
    },
  ]

  it('shows a visible toolbar filter button by default, opening the filter panel', async () => {
    const user = userEvent.setup()
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filtros' }))

    expect(screen.getByText('Sin filtros activos')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Agregar filtro' }),
    ).toBeInTheDocument()
  })

  it('hides the toolbar filter button when showToolbar is turned off explicitly', () => {
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        showToolbar={false}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Filtros' }),
    ).not.toBeInTheDocument()
  })

  it('shows every group unfiltered when filterModel has no items', () => {
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
      />,
    )

    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.getByText('SOD CEDRITOS (1)')).toBeInTheDocument()
  })

  it('filters leaf rows before grouping, dropping a group entirely once none of its rows match', () => {
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        filterModel={{
          items: [{ field: 'producto', operator: 'contains', value: 'Tapete' }],
        }}
      />,
    )

    // Both of SOD SUBA's rows are "Tapete …", so it keeps its full count —
    // SOD CEDRITOS's only row ("Felpudo C") doesn't match "Tapete" at all,
    // so the group itself disappears rather than showing with count 0.
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD CEDRITOS/)).not.toBeInTheDocument()
  })

  it('filters on the groupBy field itself the same way as any other field', () => {
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        filterModel={{
          items: [{ field: 'tienda', operator: 'equals', value: 'SOD SUBA' }],
        }}
      />,
    )

    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD CEDRITOS/)).not.toBeInTheDocument()
  })

  it('computes the grand total over the filtered rows only, not the full dataset', () => {
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        aggregations={[{ field: 'valorTotalOrden', fn: 'sum' }]}
        filterModel={{
          items: [{ field: 'producto', operator: 'contains', value: 'Tapete' }],
        }}
      />,
    )

    // Only the two "Tapete" rows count: 119600 + 135000 — "Felpudo C"'s
    // 50000 is excluded from the grand total, not just hidden from view.
    expect(
      screen.getByText(`Total Valor Total Orden: ${119600 + 135000}`),
    ).toBeInTheDocument()
  })

  it('supports numeric comparison operators', () => {
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        filterModel={{
          items: [{ field: 'valorTotalOrden', operator: '>', value: 130000 }],
        }}
      />,
    )

    // Only SOD SUBA's 135000 row clears 130000 (its 119600 row doesn't);
    // SOD CEDRITOS's 50000 row doesn't either, dropping that group entirely.
    expect(screen.getByText('SOD SUBA (1)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD CEDRITOS/)).not.toBeInTheDocument()
  })

  it("reaches the filter panel through a column header's own menu, same as the toolbar button, and resets to the first page once a filter narrows the result", async () => {
    const user = userEvent.setup()

    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        initialState={{ pagination: { paginationModel: { pageSize: 1 } } }}
        pageSizeOptions={[1, 10]}
      />,
    )

    // 2 groups over a page size of 1 is 2 pages — move to the second.
    await user.click(screen.getByLabelText('Go to next page'))
    expect(screen.getByText('SOD CEDRITOS (1)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD SUBA/)).not.toBeInTheDocument()

    // Opened from the "Producto" column's own menu — MUI's column menu
    // "Filter" item, left untouched by GroupedDataTable — rather than the
    // toolbar button, but it's the exact same panel either way.
    await user.click(screen.getByLabelText('Producto column menu'))
    await user.click(screen.getByRole('menuitem', { name: 'Filter' }))
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))
    await user.click(screen.getByRole('combobox', { name: 'Columna' }))
    await user.click(screen.getByRole('option', { name: 'Producto' }))
    await user.type(screen.getByLabelText('Valor'), 'Tapete')

    // Narrows the result to SOD SUBA only, and the page reset to the first
    // one — without that reset, this would be stuck on the now
    // out-of-range second page, showing nothing.
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD CEDRITOS/)).not.toBeInTheDocument()
  })

  it('adds, edits, and removes individual filters, and clears all of them at once', async () => {
    const user = userEvent.setup()

    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filtros' }))

    // Add a first filter: Producto contiene "Tapete".
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))
    await user.click(screen.getByRole('combobox', { name: 'Columna' }))
    await user.click(screen.getByRole('option', { name: 'Producto' }))
    await user.type(screen.getByLabelText('Valor'), 'Tapete')
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD CEDRITOS/)).not.toBeInTheDocument()

    // Add a second filter — both rows now exist, with an AND/OR toggle
    // between them (defaults to AND).
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))
    expect(screen.getAllByLabelText('Eliminar filtro')).toHaveLength(2)
    expect(
      screen.getByRole('combobox', { name: 'Operador lógico' }),
    ).toBeInTheDocument()

    // Remove just the second filter — back to one row, no logic toggle.
    await user.click(screen.getAllByLabelText('Eliminar filtro')[1])
    expect(screen.getAllByLabelText('Eliminar filtro')).toHaveLength(1)
    expect(
      screen.queryByRole('combobox', { name: 'Operador lógico' }),
    ).not.toBeInTheDocument()
    // The remaining (first) filter is still in effect.
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD CEDRITOS/)).not.toBeInTheDocument()

    // Remove all — every group is visible again.
    await user.click(screen.getByRole('button', { name: 'Eliminar todos' }))
    expect(screen.queryByLabelText('Eliminar filtro')).not.toBeInTheDocument()
    expect(screen.getByText('Sin filtros activos')).toBeInTheDocument()
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.getByText('SOD CEDRITOS (1)')).toBeInTheDocument()
  })

  it("shows an AND/OR combo box on every row from the second one on, matching MUI X Premium's own panel — editable on the second row, disabled (mirroring it) on any row after that", async () => {
    const user = userEvent.setup()

    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filtros' }))

    // First row: no AND/OR combo box at all.
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))
    expect(
      screen.queryByRole('combobox', { name: 'Operador lógico' }),
    ).not.toBeInTheDocument()

    // Second row: exactly one AND/OR combo box, enabled.
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))
    let logicCombos = screen.getAllByRole('combobox', {
      name: 'Operador lógico',
    })
    expect(logicCombos).toHaveLength(1)
    expect(logicCombos[0]).not.toHaveAttribute('aria-disabled', 'true')

    // Third row: a second AND/OR combo box appears, disabled — it mirrors
    // the one editable value (`filterModel.logicOperator`), not an
    // independent choice per row.
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))
    logicCombos = screen.getAllByRole('combobox', { name: 'Operador lógico' })
    expect(logicCombos).toHaveLength(2)
    expect(logicCombos[0]).not.toHaveAttribute('aria-disabled', 'true')
    expect(logicCombos[1]).toHaveAttribute('aria-disabled', 'true')
  })

  it('uses a close ("X") icon to remove an individual filter and a delete-forever icon for "Eliminar todos", matching MUI X Premium\'s own panel', async () => {
    const user = userEvent.setup()

    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))

    expect(
      within(screen.getByLabelText('Eliminar filtro')).getByTestId('CloseIcon'),
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('button', { name: 'Eliminar todos' }),
      ).getByTestId('DeleteForeverIcon'),
    ).toBeInTheDocument()
  })

  it("shows a funnel icon next to a column header while that field has an active filter, matching MUI X Premium's own grouped-data-grid screenshot", () => {
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        filterModel={{
          items: [{ field: 'producto', operator: 'contains', value: 'Tapete' }],
        }}
      />,
    )

    // "Producto" is filtered — it gets the icon.
    expect(
      within(
        screen.getByRole('columnheader', { name: /Producto/ }),
      ).getByTestId('FilterAltOutlinedIcon'),
    ).toBeInTheDocument()

    // "Tienda" (the groupBy field, untouched by this filter) and
    // "Valor Total Orden" don't.
    expect(
      within(
        screen.getByRole('columnheader', { name: /Tienda/ }),
      ).queryByTestId('FilterAltOutlinedIcon'),
    ).not.toBeInTheDocument()
    expect(
      within(
        screen.getByRole('columnheader', { name: /Valor Total Orden/ }),
      ).queryByTestId('FilterAltOutlinedIcon'),
    ).not.toBeInTheDocument()
  })

  it('moves the funnel icon off a field once its only filter item is removed, and does not show it for an item with no value yet', async () => {
    const user = userEvent.setup()

    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))
    await user.click(screen.getByRole('combobox', { name: 'Columna' }))
    await user.click(screen.getByRole('option', { name: 'Producto' }))

    // Added, but with no value yet — not "active" (same definition
    // `rowMatchesFilterModel` itself uses), so no icon yet.
    expect(
      within(
        screen.getByRole('columnheader', { name: /Producto/ }),
      ).queryByTestId('FilterAltOutlinedIcon'),
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Valor'), 'Tapete')
    expect(
      within(
        screen.getByRole('columnheader', { name: /Producto/ }),
      ).getByTestId('FilterAltOutlinedIcon'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar todos' }))
    expect(
      within(
        screen.getByRole('columnheader', { name: /Producto/ }),
      ).queryByTestId('FilterAltOutlinedIcon'),
    ).not.toBeInTheDocument()
  })

  it('keeps the toolbar filter button in the document, re-clickable, and off the colliding "default" palette colour once the last filter is cleared', async () => {
    // Regression test: `GroupedDataTableToolbar` used to pass
    // `color="default"` once `filterCount` dropped to 0. This project's
    // theme (src/theme/index.ts) adds a *literal* `palette.default` entry
    // (meant for `<Button color="default">`, with `main: '#ffffff'` in both
    // colour schemes) — but MUI's `IconButton` resolves any colour prop,
    // `'default'` included, straight off `theme.palette[color].main`. That
    // rendered the icon fully white against the white toolbar — invisible in
    // a real browser (confirmed via Playwright; jsdom never reproduces the
    // actual computed colour, see spec 04's Risks table on visual-only
    // regressions) — with no visible trigger left to reopen the panel. Fixed
    // by using `'inherit'` for the no-active-filter state instead, which has
    // its own dedicated `IconButton` colour variant untouched by the
    // palette. This test asserts the button survives the 0-filter state
    // and never again picks up `MuiIconButton-colorDefault` — the exact
    // class that pulled in the broken white colour.
    const user = userEvent.setup()

    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        initialState={{
          filter: {
            filterModel: {
              items: [
                { field: 'tienda', operator: 'equals', value: 'SOD SUBA' },
              ],
            },
          },
        }}
      />,
    )

    const filterButton = screen.getByRole('button', { name: 'Filtros' })
    await user.click(filterButton)
    await user.click(screen.getByRole('button', { name: 'Eliminar todos' }))

    expect(filterButton).toBeInTheDocument()
    expect(filterButton.className).not.toContain('MuiIconButton-colorDefault')
    expect(filterButton.className).toContain('MuiIconButton-colorInherit')

    // Still functional: closing (the panel is still open from clearing the
    // filter above) and reopening it works exactly like any other toggle —
    // this is the exact interaction the white-on-white icon made impossible
    // to find in a real browser.
    await user.click(filterButton)
    expect(screen.queryByText('Sin filtros activos')).not.toBeInTheDocument()
    await user.click(filterButton)
    expect(screen.getByText('Sin filtros activos')).toBeInTheDocument()
  })

  it('lets every panel control actually change the result when seeded with a starting filter via initialState (not the filterModel prop)', async () => {
    const user = userEvent.setup()

    // Seeded the same way `WithFiltering` (the story) does — via
    // `initialState.filter.filterModel`, not the `filterModel` prop. Passing
    // `filterModel` directly with no `onFilterModelChange` would make this
    // component *controlled* with nothing listening for its changes: every
    // button in the panel would still compute a new model and report it,
    // but the UI would never reflect it, since nothing applies that report
    // back. That was a real, reported bug in the `WithFiltering` story —
    // "Add filter"/"Eliminar todos"/per-item delete all looked broken, and
    // the preset value looked hardcoded/uneditable, for exactly this
    // reason. `initialState` only seeds the first render; this test is the
    // regression guard for that specific mistake.
    render(
      <GroupedDataTable
        rows={filterRows}
        columns={filterColumns}
        groupBy="tienda"
        initialState={{
          filter: {
            filterModel: {
              items: [
                { field: 'producto', operator: 'contains', value: 'Felpudo' },
              ],
            },
          },
        }}
      />,
    )

    // Starting filter is in effect: only SOD CEDRITOS ("Felpudo C") matches.
    expect(screen.getByText('SOD CEDRITOS (1)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD SUBA/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filtros' }))

    // Editing the seeded filter's own value actually changes the result —
    // this is the specific interaction that looked "hardcoded" in the bug
    // report.
    const valueInput = screen.getByLabelText('Valor')
    await user.clear(valueInput)
    await user.type(valueInput, 'Tapete')
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.queryByText(/SOD CEDRITOS/)).not.toBeInTheDocument()

    // "Agregar filtro" actually adds a second, independently removable row.
    await user.click(screen.getByRole('button', { name: 'Agregar filtro' }))
    expect(screen.getAllByLabelText('Eliminar filtro')).toHaveLength(2)

    // Removing one row actually removes just that row.
    await user.click(screen.getAllByLabelText('Eliminar filtro')[1])
    expect(screen.getAllByLabelText('Eliminar filtro')).toHaveLength(1)

    // "Eliminar todos" actually clears every filter.
    await user.click(screen.getByRole('button', { name: 'Eliminar todos' }))
    expect(screen.queryByLabelText('Eliminar filtro')).not.toBeInTheDocument()
    expect(screen.getByText('Sin filtros activos')).toBeInTheDocument()
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.getByText('SOD CEDRITOS (1)')).toBeInTheDocument()
  })
})

describe('GroupedDataTable — column visibility', () => {
  it('shows a visible toolbar columns button by default, opening the standard MUI columns panel', async () => {
    const user = userEvent.setup()
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    await user.click(screen.getByRole('button', { name: 'Columnas' }))

    expect(
      screen.getByRole('checkbox', { name: 'Producto' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Show/Hide All' }),
    ).toBeInTheDocument()
  })

  it('hides the toolbar columns button when showToolbar is turned off explicitly', () => {
    render(
      <GroupedDataTable
        rows={rows}
        columns={columns}
        groupBy="tienda"
        showToolbar={false}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Columnas' }),
    ).not.toBeInTheDocument()
  })

  it('disables the groupBy field in the columns panel so its expand/collapse chevron can never be hidden', async () => {
    const user = userEvent.setup()
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    await user.click(screen.getByRole('button', { name: 'Columnas' }))

    // The "Tienda" field is what `groupBy` groups by — its checkbox is
    // disabled rather than omitted, same as MUI X Premium's own panel marks
    // a non-hideable column, and clicking it is a no-op (a disabled
    // checkbox rejects the pointer interaction outright).
    expect(screen.getByRole('checkbox', { name: 'Tienda' })).toBeDisabled()
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()
    expect(screen.getByText('SOD CEDRITOS (1)')).toBeInTheDocument()
  })

  it('hides a non-grouped column from the table once its checkbox is unchecked, and restores it when checked again', async () => {
    const user = userEvent.setup()
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    await user.click(screen.getByRole('button', { name: 'Columnas' }))
    const productoCheckbox = screen.getByRole('checkbox', {
      name: 'Producto',
    })

    await user.click(productoCheckbox)
    expect(
      screen.queryByRole('columnheader', { name: 'Producto' }),
    ).not.toBeInTheDocument()
    // Grouping itself is unaffected — the "Tienda" groupBy column is
    // untouched by hiding an unrelated column.
    expect(screen.getByText('SOD SUBA (2)')).toBeInTheDocument()

    await user.click(productoCheckbox)
    expect(
      screen.getByRole('columnheader', { name: 'Producto' }),
    ).toBeInTheDocument()
  })

  it("reaches the columns panel through a column header's own menu, same as the toolbar button", async () => {
    const user = userEvent.setup()
    render(<GroupedDataTable rows={rows} columns={columns} groupBy="tienda" />)

    // Opened from the "Producto" column's own menu — MUI's column menu
    // "Manage columns" item, left untouched by GroupedDataTable — rather
    // than the toolbar button, but it's the exact same panel either way.
    await user.click(screen.getByLabelText('Producto column menu'))
    await user.click(screen.getByRole('menuitem', { name: 'Manage columns' }))

    expect(screen.getByRole('checkbox', { name: 'Tienda' })).toBeDisabled()
  })
})
