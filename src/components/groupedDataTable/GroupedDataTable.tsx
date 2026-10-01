import { useCallback, useMemo, useState } from 'react'
import {
  GridFooterContainer,
  GridPagination,
  useGridRootProps,
} from '@mui/x-data-grid'
import type {
  FooterPropsOverrides,
  GridColDef,
  GridFooterContainerProps,
  GridRenderCellParams,
  GridRowClassNameParams,
  GridRowParams,
  GridValidRowModel,
} from '@mui/x-data-grid'
import clsx from 'clsx'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import DataTable from '#/components/dataTable/DataTable'
import type { DataTableProps } from '#/components/dataTable/DataTable'
import './GroupedDataTable.css'

// `FooterPropsOverrides` is an empty interface MUI ships specifically for
// this kind of declaration merging, so `slots.footer`/`slotProps.footer`
// both pick up these fields with no casting needed at the call site.
declare module '@mui/x-data-grid' {
  interface FooterPropsOverrides {
    groupCount: number
    grandTotals: Record<string, number>
    aggregations: Array<{ field: string }>
    columnHeaderByField: Map<string, string>
  }
}

export type AggregationFn = 'sum' | 'count' | 'avg' | 'min' | 'max'

export interface ColumnAggregation<TRow> {
  field: keyof TRow & string
  fn: AggregationFn
}

const GROUP_ROW_ID_PREFIX = '__group__'

/** Synthetic row standing in for one `groupBy` value — it does not
 *  represent a real data record. See specs/01-grouped-data-table.md's
 *  Data model section. */
export interface GroupRow {
  id: string
  __isGroupRow: true
  groupValue: string
  count: number
  aggregates: Record<string, number>
}

export function isGroupRow(row: unknown): row is GroupRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    (row as { __isGroupRow?: unknown }).__isGroupRow === true
  )
}

/** A row rendered by the underlying grid: either a real `TRow` or a
 *  synthetic `GroupRow` standing in for one of its groups. */
export type GroupedRow<TRow> = TRow | GroupRow

export type GroupedDataTableProps<TRow extends GridValidRowModel> =
  DataTableProps<TRow> & {
    /** Field to group rows by. Each distinct value becomes a collapsible
     *  synthetic group row. */
    groupBy: keyof TRow & string
    /** Per-column aggregation shown on every group row. A column not
     *  listed here is left blank on group rows. */
    aggregations?: Array<ColumnAggregation<TRow>>
  }

function computeAggregate(values: Array<number>, fn: AggregationFn): number {
  if (fn === 'count') return values.length
  if (values.length === 0) return 0
  switch (fn) {
    case 'sum':
      return values.reduce((total, value) => total + value, 0)
    case 'avg':
      return values.reduce((total, value) => total + value, 0) / values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
  }
}

/** Reads `field` off every row and keeps only the values that parse as a
 *  finite number — a row with a missing/non-numeric value for an
 *  aggregated column is skipped rather than corrupting the aggregate. */
function numericFieldValues<TRow extends GridValidRowModel>(
  rows: ReadonlyArray<TRow>,
  field: string,
): Array<number> {
  return rows
    .map((row) => Number(row[field]))
    .filter((value) => Number.isFinite(value))
}

export interface FlattenGroupedRowsResult<TRow extends GridValidRowModel> {
  /** Group rows and their (always-visible, at this step) child rows, in
   *  first-seen group order. */
  rows: Array<GroupedRow<TRow>>
  /** Number of distinct `groupBy` values found in `rows`. */
  groupCount: number
  /** Same aggregations as `aggregations`, computed over the whole dataset
   *  instead of per group — the footer's grand totals. */
  grandTotals: Record<string, number>
}

/** Pure grouping/aggregation core of `GroupedDataTable`. Groups `rows` by
 *  `groupBy`, computing each group's row count and the configured
 *  `aggregations`, and inserts one synthetic `GroupRow` ahead of each
 *  group's own rows. Groups keep the order their value first appears in
 *  `rows`. A group's own rows are omitted from the result while its value
 *  is in `collapsedGroups` — the group row itself (and its count/aggregates)
 *  is always included regardless of collapse state. */
export function flattenGroupedRows<TRow extends GridValidRowModel>(
  rows: ReadonlyArray<TRow>,
  groupBy: keyof TRow & string,
  aggregations: Array<ColumnAggregation<TRow>> = [],
  collapsedGroups: ReadonlySet<string> = new Set(),
): FlattenGroupedRowsResult<TRow> {
  const order: Array<string> = []
  const groups = new Map<string, Array<TRow>>()

  for (const row of rows) {
    const groupValue = String(row[groupBy])
    const existing = groups.get(groupValue)
    if (existing) {
      existing.push(row)
    } else {
      groups.set(groupValue, [row])
      order.push(groupValue)
    }
  }

  const flattened: Array<GroupedRow<TRow>> = []
  for (const groupValue of order) {
    // `order` only ever gains a value at the same time `groups` does.
    const groupRows = groups.get(groupValue) as Array<TRow>
    const aggregates: Record<string, number> = {}
    for (const aggregation of aggregations) {
      aggregates[aggregation.field] = computeAggregate(
        numericFieldValues(groupRows, aggregation.field),
        aggregation.fn,
      )
    }
    flattened.push({
      id: `${GROUP_ROW_ID_PREFIX}${groupValue}`,
      __isGroupRow: true,
      groupValue,
      count: groupRows.length,
      aggregates,
    })
    if (!collapsedGroups.has(groupValue)) {
      flattened.push(...groupRows)
    }
  }

  const grandTotals: Record<string, number> = {}
  for (const aggregation of aggregations) {
    grandTotals[aggregation.field] = computeAggregate(
      numericFieldValues(rows, aggregation.field),
      aggregation.fn,
    )
  }

  return { rows: flattened, groupCount: order.length, grandTotals }
}

/** Wraps one consumer-provided column so it also knows how to render a
 *  synthetic group row: the grouped column shows a chevron to expand/
 *  collapse the group plus `value (count)`, a column listed in
 *  `aggregations` shows its computed value, anything else is left blank.
 *  Real (non-group) rows render exactly as the original column would
 *  have. */
function toGroupAwareColumn<TRow extends GridValidRowModel>(
  column: GridColDef<TRow>,
  groupBy: keyof TRow & string,
  aggregatedFields: ReadonlySet<string>,
  collapsedGroups: ReadonlySet<string>,
  onToggleGroup: (groupValue: string) => void,
): GridColDef<GroupedRow<TRow>> {
  const original = column as unknown as GridColDef<GroupedRow<TRow>>

  return {
    ...original,
    renderCell: (params: GridRenderCellParams<GroupedRow<TRow>>) => {
      if (!isGroupRow(params.row)) {
        return original.renderCell
          ? original.renderCell(params)
          : params.formattedValue
      }

      const group = params.row
      if (column.field === groupBy) {
        const collapsed = collapsedGroups.has(group.groupValue)
        return (
          <span className="grouped-data-table__group-cell">
            <IconButton
              size="small"
              onClick={() => onToggleGroup(group.groupValue)}
              aria-label={collapsed ? 'Expandir grupo' : 'Contraer grupo'}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <KeyboardArrowDownIcon fontSize="small" />
              ) : (
                <KeyboardArrowUpIcon fontSize="small" />
              )}
            </IconButton>
            {`${group.groupValue} (${group.count})`}
          </span>
        )
      }
      if (aggregatedFields.has(column.field)) {
        return group.aggregates[column.field]
      }
      return ''
    },
  }
}

const GROUP_ROW_CLASS_NAME = 'grouped-data-table__group-row'

/** Marks group rows with `GROUP_ROW_CLASS_NAME` (styled in
 *  `GroupedDataTable.css`, reusing `DataTable.css`'s tokens) so they read
 *  as distinct from real data rows. Delegates to the consumer's own
 *  `getRowClassName`, if any, for real rows. */
function toGroupAwareRowClassName<TRow extends GridValidRowModel>(
  original?: (params: GridRowClassNameParams<TRow>) => string,
) {
  return (params: GridRowClassNameParams<GroupedRow<TRow>>): string => {
    if (isGroupRow(params.row)) {
      return GROUP_ROW_CLASS_NAME
    }
    return original ? original(params as GridRowClassNameParams<TRow>) : ''
  }
}

/** Group rows aren't real records, so they're never selectable — even
 *  when `checkboxSelection` is on — regardless of the consumer's own
 *  `isRowSelectable`, which still governs real rows. */
function toGroupAwareIsRowSelectable<TRow extends GridValidRowModel>(
  original?: (params: GridRowParams<TRow>) => boolean,
) {
  return (params: GridRowParams<GroupedRow<TRow>>): boolean => {
    if (isGroupRow(params.row)) {
      return false
    }
    return original ? original(params as GridRowParams<TRow>) : true
  }
}

/** Replaces the grid's default footer (`slots.footer`) so the grand-total
 *  summary sits in the same row as the pagination controls — `GridFooter`
 *  itself always renders its own fixed content, so this recomposes
 *  `GridFooterContainer` (the same flex row, `justify-content: space-between`)
 *  with our totals on one side and `GridPagination` on the other, matching
 *  `rootProps.hideFooterPagination` the way the default footer does.
 *  `groupCount`/`grandTotals`/etc. arrive via `slotProps.footer`, typed
 *  through the `FooterPropsOverrides` augmentation above. */
function GroupedDataTableFooter({
  groupCount,
  grandTotals,
  aggregations,
  columnHeaderByField,
  ...containerProps
}: GridFooterContainerProps & FooterPropsOverrides) {
  const rootProps = useGridRootProps()

  return (
    <GridFooterContainer {...containerProps}>
      <div className="grouped-data-table__totals">
        <Typography
          variant="body2"
          component="span"
          className="grouped-data-table__totals-item"
        >
          Total de grupos: {groupCount}
        </Typography>
        {aggregations.map((aggregation) => (
          <Typography
            key={aggregation.field}
            variant="body2"
            component="span"
            className="grouped-data-table__totals-item"
          >
            Total {columnHeaderByField.get(aggregation.field)}:{' '}
            {grandTotals[aggregation.field]}
          </Typography>
        ))}
      </div>
      {rootProps.pagination && !rootProps.hideFooterPagination && (
        <GridPagination />
      )}
    </GridFooterContainer>
  )
}

/** Groups rows by `groupBy` and shows a configurable per-column
 *  aggregation on collapsible group rows, on top of the existing
 *  `DataTable`. See specs/01-grouped-data-table.md. */
const GroupedDataTable = <TRow extends GridValidRowModel>({
  className,
  groupBy,
  aggregations = [],
  // `DataGridProps['rows']` is publicly optional (MUI defaults it to `[]`
  // internally) even though this app always passes it explicitly.
  rows = [],
  columns,
  getRowClassName,
  isRowSelectable,
  ...props
}: GroupedDataTableProps<TRow>) => {
  // Every group present when the component first mounts starts collapsed.
  // A group that appears later (e.g. `rows` refetched with a new value) is
  // not in this initial set and so renders expanded — out of scope for
  // this spec, which only requires collapsed-by-default on first render.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(rows.map((row) => String(row[groupBy]))),
  )

  const toggleGroup = useCallback((groupValue: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupValue)) {
        next.delete(groupValue)
      } else {
        next.add(groupValue)
      }
      return next
    })
  }, [])

  const {
    rows: flattenedRows,
    groupCount,
    grandTotals,
  } = useMemo(
    () => flattenGroupedRows(rows, groupBy, aggregations, collapsedGroups),
    [rows, groupBy, aggregations, collapsedGroups],
  )

  const columnHeaderByField = useMemo(
    () =>
      new Map(
        columns.map((column) => [
          column.field,
          column.headerName ?? column.field,
        ]),
      ),
    [columns],
  )

  const aggregatedFields = useMemo(
    () => new Set(aggregations.map((aggregation) => aggregation.field)),
    [aggregations],
  )

  const groupedColumns = useMemo(
    () =>
      columns.map((column) =>
        toGroupAwareColumn(
          column,
          groupBy,
          aggregatedFields,
          collapsedGroups,
          toggleGroup,
        ),
      ),
    [columns, groupBy, aggregatedFields, collapsedGroups, toggleGroup],
  )

  const groupAwareGetRowClassName = useMemo(
    () => toGroupAwareRowClassName(getRowClassName),
    [getRowClassName],
  )

  const groupAwareIsRowSelectable = useMemo(
    () => toGroupAwareIsRowSelectable(isRowSelectable),
    [isRowSelectable],
  )

  return (
    <DataTable<GroupedRow<TRow>>
      {...(props as DataTableProps<GroupedRow<TRow>>)}
      rows={flattenedRows}
      columns={groupedColumns}
      getRowClassName={groupAwareGetRowClassName}
      isRowSelectable={groupAwareIsRowSelectable}
      // `groupBy` is always set on this component, so column sorting is
      // always off — sorting the flattened rows would scramble group/child
      // pairing (see specs/01-grouped-data-table.md's Risks). A hard
      // requirement, not a passed-through default: placed after the
      // `...props` spread so a consumer can't override it. Pagination and
      // column drag-reorder are untouched and keep working.
      disableColumnSorting
      slots={{
        ...props.slots,
        footer: GroupedDataTableFooter,
      }}
      slotProps={{
        ...props.slotProps,
        footer: {
          groupCount,
          grandTotals,
          aggregations,
          columnHeaderByField,
        },
      }}
      className={clsx('grouped-data-table', className)}
    />
  )
}

export default GroupedDataTable
