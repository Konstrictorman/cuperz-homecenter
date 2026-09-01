import { DataGrid } from '@mui/x-data-grid'
import type { DataGridProps, GridValidRowModel } from '@mui/x-data-grid'
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
    <div
      className={['data-table', 'w-full overflow-x-auto', className]
        .filter(Boolean)
        .join(' ')}
    >
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
      />
    </div>
  )
}

export default DataTable
