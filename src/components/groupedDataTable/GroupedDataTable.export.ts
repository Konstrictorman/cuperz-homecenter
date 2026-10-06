import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RefObject } from 'react'
import type { GridApi, GridColDef, GridValidRowModel } from '@mui/x-data-grid'

/** Stands in for the `apiRef` every `GridColDef['valueGetter']`/
 *  `valueFormatter` signature requires as a 4th argument — there is no live
 *  grid instance to hand one from here, exporting runs over plain row data
 *  entirely outside a mounted grid. Every column in this codebase only reads
 *  its first argument (`value`) — see `usePurchaseOrdersColumns.tsx` — so a
 *  stub whose `.current` is never actually dereferenced is enough; this
 *  mirrors `matchesFilterItem`'s own doc comment (GroupedDataTable.tsx) on
 *  the same `apiRef`-outside-a-mounted-grid limitation for filter operators. */
const EXPORT_API_REF = { current: null } as unknown as RefObject<GridApi>

function formatExportValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** One real record's value for one column, as plain text — `valueGetter`/
 *  `valueFormatter` run same as the live grid would, same precedent as the
 *  rest of this function's own doc comment on `GridColDef`'s typing here.
 *  Deliberately *not* group-aware the way the live grid's own cells are
 *  (`toGroupAwareColumn`, GroupedDataTable.tsx, blanks a `groupBy` field on
 *  every leaf row since its value is already shown once on the ancestor
 *  group row): that blanking is a readability choice for the *on-screen*
 *  tree view, not something a flat export should inherit — see
 *  `buildExportMatrix`'s own doc comment for why export never uses the
 *  on-screen tree shape at all. */
function exportCellValue<TRow extends GridValidRowModel>(
  row: TRow,
  column: GridColDef<TRow>,
): string {
  const rawValue = (row as GridValidRowModel)[column.field]
  // `GridColDef<TRow>`'s `valueGetter`/`valueFormatter` fields type their own
  // first ("raw value") argument as `never` when accessed generically like
  // this — `GridColDef`'s R/V/F type params don't carry the specific
  // function's own `TValue`, which only a literal column definition's own
  // inferred type would pin down. The cast is purely to satisfy that; at
  // runtime this calls whatever function the consumer's own column def
  // assigned with the same raw field value the grid itself would pass it.
  const value = column.valueGetter
    ? column.valueGetter(rawValue as never, row, column, EXPORT_API_REF)
    : rawValue
  const formatted = column.valueFormatter
    ? column.valueFormatter(value as never, row, column, EXPORT_API_REF)
    : value
  return formatExportValue(formatted)
}

export interface ExportMatrix {
  headers: Array<string>
  body: Array<Array<string>>
}

/** Turns `rows` — every real record currently matching the active filters
 *  (typically sorted the same way the grid is, but *never* the collapsed/
 *  expanded group tree the grid actually renders — see below) — into a
 *  plain header row + string matrix, ready for `exportMatrixToCsv`/
 *  `exportMatrixToExcel`/`exportMatrixToPdf`. An `actions` column is
 *  dropped — it has interactive buttons, not an underlying data value, same
 *  as MUI X Premium's own CSV/Excel export excludes it by default.
 *
 *  Deliberately *flat*, one row per real record, never the synthetic
 *  group/group-footer rows the live grid renders — confirmed against MUI X
 *  Premium's own CSV export source
 *  (`@mui/x-data-grid`'s `hooks/features/export/utils.js`,
 *  `defaultGetRowsToExport`): it reads from
 *  `gridFilteredSortedRowIdsSelector`, the full filtered+sorted row list,
 *  not `gridExpandedSortedRowIdsSelector` /
 *  `gridVisibleSortedRowEntriesSelector` (the ones that respect which
 *  groups are currently collapsed on screen) — so Premium's own export
 *  already always includes every record regardless of collapse state. This
 *  component's *previous* implementation exported `flattenedRows` (the
 *  on-screen tree, collapse-aware) instead, which silently dropped every
 *  record under a collapsed group — every group starts collapsed by
 *  default (see `GroupedDataTable`'s own `collapsedPaths` initial state),
 *  so in practice that meant *most* records were missing from every
 *  export. Call with `filteredRows` (or, with a sort applied,
 *  `sortLeafRows(filteredRows, activeSortModel)`) — both already exist in
 *  `GroupedDataTable`'s own render scope — never `flattenedRows`. */
export function buildExportMatrix<TRow extends GridValidRowModel>(
  rows: ReadonlyArray<TRow>,
  columns: ReadonlyArray<GridColDef<TRow>>,
): ExportMatrix {
  const exportColumns = columns.filter((column) => column.type !== 'actions')
  const headers = exportColumns.map(
    (column) => column.headerName ?? column.field,
  )
  const body = rows.map((row) =>
    exportColumns.map((column) => exportCellValue(row, column)),
  )
  return { headers, body }
}

/** One bottom-of-table summary line for `exportMatrixToPdf`, aligned
 *  column-for-column with `buildExportMatrix`'s own headers/body (same
 *  `actions` column dropped — see its own doc comment) — a column with an
 *  active aggregation (`GroupedDataTable`'s own `aggregations` prop) shows
 *  `Total <headerName>: <value>`, mirroring `GroupedDataTableFooter`'s own
 *  on-screen grand-total labels (GroupedDataTable.tsx); every other column is
 *  left blank. CSV/Excel aren't given this row — there's no established
 *  "footer row mixed in with data rows" convention for a spreadsheet
 *  consumer to read that as a value-less exception rather than just another
 *  record. */
export function buildPdfSummaryRow<TRow extends GridValidRowModel>(
  columns: ReadonlyArray<GridColDef<TRow>>,
  aggregations: ReadonlyArray<{ field: string }>,
  grandTotals: Record<string, number>,
): Array<string> {
  const exportColumns = columns.filter((column) => column.type !== 'actions')
  const aggregatedFields = new Set(
    aggregations.map((aggregation) => aggregation.field),
  )
  return exportColumns.map((column) => {
    if (!aggregatedFields.has(column.field)) {
      return ''
    }
    const headerName = column.headerName ?? column.field
    const rawValue = grandTotals[column.field]
    const formatted = column.valueFormatter
      ? column.valueFormatter(rawValue as never, undefined as never, column, EXPORT_API_REF)
      : rawValue
    return `Total ${headerName}: ${formatExportValue(formatted)}`
  })
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function toCsvText(headers: Array<string>, body: Array<Array<string>>): string {
  return [headers, ...body]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n')
}

/** Downloads `{ headers, body }` (see `buildExportMatrix`) as a `.csv` file.
 *  Prefixed with a UTF-8 BOM so Excel — which otherwise guesses Latin-1 and
 *  mangles accented characters — opens Spanish text (e.g. "Descripción")
 *  correctly rather than needing an explicit "Import" with encoding picked
 *  by hand. */
export function exportMatrixToCsv(
  { headers, body }: ExportMatrix,
  fileName: string,
): void {
  const blob = new Blob(['﻿', toCsvText(headers, body)], {
    type: 'text/csv;charset=utf-8;',
  })
  triggerDownload(blob, fileName)
}

/** Downloads `{ headers, body }` as a real `.xlsx` workbook (via `exceljs` —
 *  this is Community `@mui/x-data-grid`, which has no export of its own;
 *  Excel export is Premium-only there too). One sheet, a bold header row. */
export async function exportMatrixToExcel(
  { headers, body }: ExportMatrix,
  fileName: string,
  sheetName = 'Datos',
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)
  sheet.addRow(headers).font = { bold: true }
  for (const row of body) {
    sheet.addRow(row)
  }
  sheet.columns.forEach((column) => {
    column.width = 20
  })
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, fileName)
}

// This project's actual primary brand color (src/theme/index.ts's
// `palette.primary.main`, light scheme) — not the Cuperz marketing red from
// the sibling prototype repo's CLAUDE.md, which this app's own theme doesn't
// use verbatim.
const PDF_HEADER_FILL: [number, number, number] = [0xcf, 0x20, 0x25]

/** Renders `{ headers, body }` straight into a downloadable `.pdf` via
 *  `jspdf`/`jspdf-autotable` — "Print" has to always produce an actual PDF
 *  regardless of what printers (if any) are configured, which the browser's
 *  own `window.print()` dialog can't guarantee (the user could pick any
 *  destination there, PDF or not); generating the file client-side sidesteps
 *  that entirely. Landscape by default since these tables are typically
 *  wider than they are tall.
 *
 *  `title` is the heading printed above the table — `GroupedDataTable`'s own
 *  `tableTitle` prop, distinct from `fileName` (which only names the
 *  downloaded file, e.g. "datos.pdf", and was previously reused, confusingly,
 *  as this heading too).
 *
 *  `summaryRow` (see `buildPdfSummaryRow`), when given, is appended as a
 *  bold row after the table body via `autoTable`'s own `foot` section — e.g.
 *  a lone "Total Valor: 1170000" cell under the "Valor" column, everything
 *  else in that row blank. */
export function exportMatrixToPdf(
  { headers, body }: ExportMatrix,
  fileName: string,
  title?: string,
  summaryRow?: Array<string>,
): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  if (title) {
    doc.setFontSize(12)
    doc.text(title, 14, 12)
  }
  autoTable(doc, {
    head: [headers],
    body,
    foot: summaryRow ? [summaryRow] : undefined,
    startY: title ? 18 : 10,
    styles: { fontSize: 8 },
    headStyles: { fillColor: PDF_HEADER_FILL },
    footStyles: { fontStyle: 'bold', textColor: 0, fillColor: false },
  })
  doc.save(fileName)
}
