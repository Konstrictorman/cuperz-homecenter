import { DataGrid } from '@mui/x-data-grid'
import type { DataGridProps, GridValidRowModel } from '@mui/x-data-grid'
import clsx from 'clsx'
import './DataTable.css'

export type DataTableProps<TRow extends GridValidRowModel = GridValidRowModel> =
  DataGridProps<TRow> & {
    className?: string
  }

const DataTable = <TRow extends GridValidRowModel>({
  className,
  checkboxSelection = true,
  disableRowSelectionOnClick = true,
  autoHeight = true,
  hideFooterSelectedRowCount = true,
  pageSizeOptions = [10, 25, 50],
  initialState,
  ...props
}: DataTableProps<TRow>) => {
  return (
    <div className={clsx('data-table', className)}>
      <DataGrid<TRow>
        {...props}
        checkboxSelection={checkboxSelection}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        autoHeight={autoHeight}
        hideFooterSelectedRowCount={hideFooterSelectedRowCount}
        pageSizeOptions={pageSizeOptions}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          ...initialState,
        }}
        slotProps={{
          ...props.slotProps,
          // Icon buttons the grid renders itself (the column-menu ellipsis
          // chief among them) fall back to MuiIconButton's `color="default"`,
          // which this project's theme maps to a literal white
          // (`palette.default.main`, added for `<Button color="default">`,
          // not icon buttons) — rendering white-on-white against the header.
          // Same fix as GroupedDataTable's `baseIconButton` override.
          baseIconButton: {
            color: 'inherit',
            ...props.slotProps?.baseIconButton,
          },
        }}
      />
    </div>
  )
}

export default DataTable
