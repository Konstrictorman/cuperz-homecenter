import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { ComponentProps, ReactNode, RefObject } from 'react'
import {
  ColumnsPanelTrigger,
  FilterPanelTrigger,
  GridFooterContainer,
  GridLogicOperator,
  GridPagination,
  Toolbar,
  ToolbarButton,
  useGridRootProps,
} from '@mui/x-data-grid'
import type {
  FooterPropsOverrides,
  GridApi,
  GridColDef,
  GridColumnHeaderParams,
  GridFilterItem,
  GridFilterModel,
  GridFooterContainerProps,
  GridPaginationModel,
  GridRenderCellParams,
  GridRowClassNameParams,
  GridRowParams,
  GridSortModel,
  GridValidRowModel,
  ToolbarPropsOverrides,
} from '@mui/x-data-grid'
import clsx from 'clsx'
import Badge from '@mui/material/Badge'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import DownloadIcon from '@mui/icons-material/Download'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import FilterListIcon from '@mui/icons-material/FilterList'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import DataTable from '#/components/dataTable/DataTable'
import type { DataTableProps } from '#/components/dataTable/DataTable'
import {
  buildExportMatrix,
  buildPdfSummaryRow,
  exportMatrixToCsv,
  exportMatrixToExcel,
  exportMatrixToPdf,
} from './GroupedDataTable.export'
import './GroupedDataTable.css'

// `FooterPropsOverrides` is an empty interface MUI ships specifically for
// this kind of declaration merging, so `slots.footer`/`slotProps.footer`
// both pick up these fields with no casting needed at the call site.
declare module '@mui/x-data-grid' {
  interface FooterPropsOverrides {
    groupCount: number
    grandTotals: Record<string, number>
    aggregations: Array<{ field: string }>
    columnByField: Map<string, GridColDef>
    onExpandAll: () => void
    onCollapseAll: () => void
  }
  interface ToolbarPropsOverrides {
    filterCount: number
    onPrint: () => void
    onExportCsv: () => void
    onExportExcel: () => void
  }
}

/** Field(s) to group rows by — see `GroupedDataTableProps['groupBy']`. */
export type GroupByField<TRow> = keyof TRow & string

export type AggregationFn = 'sum' | 'count' | 'avg' | 'min' | 'max'

/** A pluggable aggregation function: reduces one column's numeric values
 *  (already filtered to finite numbers — see `numericFieldValues`) for one
 *  group down to a single number. */
export type AggregationFunction = (values: ReadonlyArray<number>) => number

export interface ColumnAggregation<TRow> {
  field: keyof TRow & string
  /** One of the built-in `AggregationFn` names, or a key of the consumer's
   *  own `aggregationFunctions` prop. Widened to accept any string so a
   *  custom function can be referenced, while the 5 built-in names still
   *  autocomplete. */
  fn: AggregationFn | (string & {})
}

/** Where a group's aggregated values are shown — mirrors MUI X Premium's
 *  `getAggregationPosition`, simplified to one grid-wide setting (no
 *  confirmed need for per-node granularity):
 *  - `'inline'` (default): the value appears directly on the group's own
 *    row, next to its chevron/count — today's only behavior.
 *  - `'footer'`: the group's own row is left blank for aggregated columns;
 *    a separate subtotal row is appended as that group's last row instead,
 *    shown regardless of collapse state (same precedent as the dataset-wide
 *    grand-total footer always being visible). */
export type AggregationPosition = 'inline' | 'footer'

/** One active column sort — the single-field reduction of a `GridSortModel`
 *  this component actually supports (multi-column sort via shift-click isn't
 *  offered by this project's Community edition's own header UI to begin
 *  with — that's Pro/Premium). `field` is whatever `GridColDef.field` the
 *  user clicked the header of; `sortGroupTree` is what turns this into an
 *  actual row order. */
export interface SortModel {
  field: string
  sort: 'asc' | 'desc'
}

const GROUP_ROW_ID_PREFIX = '__group__'
const GROUP_FOOTER_ROW_ID_PREFIX = '__group_footer__'
// Horizontal indent per nesting level, applied to the grouped-column cell —
// matches MUI X Premium's own default indent for its auto-generated
// grouping column (`--DataGrid-cellOffsetMultiplier` (2) × its base spacing
// unit (8px) = 16px per depth; see `GridGroupingCriteriaCell`), applied
// in-cell here instead since there's no separate synthetic grouping column.
const GROUP_INDENT_PX = 16

/** Turns a node's `path` into one string key, for the collapsed-set and for
 *  row ids. `JSON.stringify` rather than a joined/delimited string so two
 *  different paths can never collide on the same key regardless of what
 *  characters a real group value contains (e.g. a store name with a comma
 *  or a repeated value at a different nesting level). */
function pathKeyOf(path: ReadonlyArray<string>): string {
  return JSON.stringify(path)
}

/** Synthetic row standing in for one node of the `groupBy` tree — it does
 *  not represent a real data record. See specs/01-grouped-data-table.md and
 *  specs/02-grouped-data-table-advanced-grouping.md. */
export interface GroupRow {
  id: string
  __isGroupRow: true
  /** Full chain of group values from the root down to this node, inclusive
   *  — e.g. `['Tienda A', 'Contenedor 1']` for a depth-1 node under a
   *  2-level `groupBy`. */
  path: ReadonlyArray<string>
  /** 0-based nesting level; 0 is the outermost `groupBy` field. */
  depth: number
  /** Which `groupBy` field this node groups by. */
  field: string
  groupValue: string
  /** Recursive count of real (leaf) rows under this node, at any depth. */
  count: number
  /** Only populated when `aggregationPosition` is `'inline'` (the default)
   *  — otherwise empty, since the value is shown on a `GroupFooterRow`
   *  instead. */
  aggregates: Record<string, number>
}

export function isGroupRow(row: unknown): row is GroupRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    (row as { __isGroupRow?: unknown }).__isGroupRow === true
  )
}

/** Synthetic subtotal row appended after a group's own row (and, if
 *  expanded, its children) when `aggregationPosition="footer"`. Always
 *  rendered regardless of that group's collapse state, same as the
 *  dataset-wide grand-total footer. */
export interface GroupFooterRow {
  id: string
  __isGroupFooterRow: true
  path: ReadonlyArray<string>
  depth: number
  field: string
  groupValue: string
  aggregates: Record<string, number>
}

export function isGroupFooterRow(row: unknown): row is GroupFooterRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    (row as { __isGroupFooterRow?: unknown }).__isGroupFooterRow === true
  )
}

/** A row rendered by the underlying grid: a real `TRow`, or a synthetic
 *  `GroupRow`/`GroupFooterRow` standing in for one of its groups. */
export type GroupedRow<TRow> = TRow | GroupRow | GroupFooterRow

export type GroupedDataTableProps<TRow extends GridValidRowModel> =
  DataTableProps<TRow> & {
    /** Field(s) to group rows by, outer to inner. A single field keeps the
     *  original single-level behavior; an array nests a group per field
     *  (e.g. `['tienda', 'contenedor']` for a Tienda → Contenedor tree) —
     *  see specs/02-grouped-data-table-advanced-grouping.md. */
    groupBy: GroupByField<TRow> | ReadonlyArray<GroupByField<TRow>>
    /** Per-column aggregation shown on every group. A column not listed
     *  here is left blank on group/subtotal rows. Uncontrolled by default —
     *  every numeric, non-`groupBy` column's header carries a
     *  vertical-ellipsis menu (mirroring MUI X Premium's own column-header
     *  "Aggregation" control, rebuilt here since row grouping/aggregation
     *  is Premium-only in `@mui/x-data-grid` Community) a user can open to
     *  set, change, or clear (`"Sin agregación"`) that column's function
     *  without the consumer managing any state — passed alone (no
     *  `onAggregationsChange`), this only *seeds* that menu's state, the
     *  same way `initialState` seeds `paginationModel`/`filterModel` below;
     *  it's read once, and every menu selection updates a plain internal
     *  copy from then on, left for the consumer's own prop value. See
     *  `onAggregationsChange` to make it a real controlled prop instead
     *  (NOT simply "pass this prop and it's controlled", unlike
     *  `paginationModel`/`filterModel` — this prop had no change-reporting
     *  counterpart before this menu existed, and every call site in this
     *  codebase already passes a plain literal with no handler; treating
     *  that as controlled would make the menu a no-op for all of them). */
    aggregations?: Array<ColumnAggregation<TRow>>
    /** Called whenever the aggregation model changes — from a user picking
     *  a different function in a column header's menu, most of the time.
     *  Passing this is what opts `aggregations` into being a real
     *  controlled prop (see its own doc comment for why presence of
     *  `aggregations` alone isn't enough here) — once given, the live
     *  `aggregations` prop value is authoritative on every render, same as
     *  any other controlled React input, and the consumer is responsible
     *  for feeding a selection's reported model back into it. */
    onAggregationsChange?: (
      aggregations: Array<ColumnAggregation<TRow>>,
    ) => void
    /** Named aggregation functions available to `aggregations[].fn` (and
     *  offered, by name, in each eligible column header's aggregation
     *  menu), merged over `DEFAULT_AGGREGATION_FUNCTIONS` — add a new name
     *  or override a built-in one. */
    aggregationFunctions?: Record<string, AggregationFunction>
    /** @default 'inline' */
    aggregationPosition?: AggregationPosition
    /** Base name (no extension) for the file the toolbar's download menu
     *  produces — "Descargar como CSV"/"Descargar como Excel" append
     *  `.csv`/`.xlsx`, "Imprimir" appends `.pdf`. See
     *  GroupedDataTable.export.ts.
     *  @default 'datos' */
    exportFileName?: string
    /** Heading printed above the table in the "Descargar como PDF" export
     *  (`exportMatrixToPdf`'s own `title` — GroupedDataTable.export.ts).
     *  Previously `exportFileName` did double duty as this heading too,
     *  which meant every PDF literally read "datos" at the top unless a
     *  consumer renamed the downloaded file itself just to get a different
     *  heading. Falls back to `exportFileName` when unset, so existing call
     *  sites keep their current (if accidental) heading unchanged.
     *  @default exportFileName */
    tableTitle?: string
  }

/** Built-in aggregation functions, keyed by the `AggregationFn` names
 *  `aggregations[].fn` accepts out of the box. Spread into a custom
 *  `aggregationFunctions` prop to extend rather than replace this set. */
export const DEFAULT_AGGREGATION_FUNCTIONS: Record<
  AggregationFn,
  AggregationFunction
> = {
  sum: (values) => values.reduce((total, value) => total + value, 0),
  count: (values) => values.length,
  avg: (values) =>
    values.length === 0
      ? 0
      : values.reduce((total, value) => total + value, 0) / values.length,
  min: (values) => (values.length === 0 ? 0 : Math.min(...values)),
  max: (values) => (values.length === 0 ? 0 : Math.max(...values)),
}

function applyAggregation(
  values: ReadonlyArray<number>,
  fn: string,
  aggregationFunctions: Record<string, AggregationFunction>,
): number {
  // `fn` is a consumer-supplied string (`ColumnAggregation.fn`), not
  // necessarily a key `aggregationFunctions` actually has — `Record`'s index
  // signature doesn't model that absence, so the lookup is widened to admit
  // `undefined` explicitly instead of relying on (unsound) inference here.
  const lookup = aggregationFunctions as Record<
    string,
    AggregationFunction | undefined
  >
  const aggregationFunction = lookup[fn]
  return aggregationFunction ? aggregationFunction(values) : 0
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

function computeAggregates<TRow extends GridValidRowModel>(
  rows: ReadonlyArray<TRow>,
  aggregations: ReadonlyArray<ColumnAggregation<TRow>>,
  aggregationFunctions: Record<string, AggregationFunction>,
): Record<string, number> {
  const aggregates: Record<string, number> = {}
  for (const aggregation of aggregations) {
    aggregates[aggregation.field] = applyAggregation(
      numericFieldValues(rows, aggregation.field),
      aggregation.fn,
      aggregationFunctions,
    )
  }
  return aggregates
}

/** One node of the `groupBy` tree, built by `buildGroupTree`. `children` is
 *  either more nodes (there are further `groupBy` fields left) or the real
 *  leaf rows belonging to this node (the last `groupBy` field was just
 *  applied) — tagged rather than a plain union so `flattenGroupTree` can
 *  tell them apart without relying on shape-sniffing `TRow`. */
export interface GroupTreeNode<TRow extends GridValidRowModel> {
  path: ReadonlyArray<string>
  depth: number
  field: string
  value: string
  /** Recursive leaf-row count — always `groupRows.length` at build time,
   *  regardless of how many more levels are nested under this node. */
  count: number
  aggregates: Record<string, number>
  children:
    | { kind: 'groups'; nodes: Array<GroupTreeNode<TRow>> }
    | { kind: 'rows'; rows: Array<TRow> }
}

/** Pure, UI-state-free grouping core. Recursively partitions `rows` by each
 *  field in `groupByFields` (outer to inner), computing each node's
 *  recursive leaf count and configured `aggregations` directly from the row
 *  slice it owns before partitioning further. Nodes keep the order their
 *  value first appears among their siblings. */
export function buildGroupTree<TRow extends GridValidRowModel>(
  rows: ReadonlyArray<TRow>,
  groupByFields: ReadonlyArray<string>,
  aggregations: ReadonlyArray<ColumnAggregation<TRow>> = [],
  aggregationFunctions: Record<
    string,
    AggregationFunction
  > = DEFAULT_AGGREGATION_FUNCTIONS,
  depth = 0,
  parentPath: ReadonlyArray<string> = [],
): Array<GroupTreeNode<TRow>> {
  const field = groupByFields[depth]
  const order: Array<string> = []
  const buckets = new Map<string, Array<TRow>>()

  for (const row of rows) {
    const value = String(row[field])
    const existing = buckets.get(value)
    if (existing) {
      existing.push(row)
    } else {
      buckets.set(value, [row])
      order.push(value)
    }
  }

  return order.map((value) => {
    // `order` only ever gains a value at the same time `buckets` does.
    const groupRows = buckets.get(value) as Array<TRow>
    const path = [...parentPath, value]
    const nextDepth = depth + 1
    const children: GroupTreeNode<TRow>['children'] =
      nextDepth < groupByFields.length
        ? {
            kind: 'groups',
            nodes: buildGroupTree(
              groupRows,
              groupByFields,
              aggregations,
              aggregationFunctions,
              nextDepth,
              path,
            ),
          }
        : { kind: 'rows', rows: groupRows }

    return {
      path,
      depth,
      field,
      value,
      count: groupRows.length,
      aggregates: computeAggregates(
        groupRows,
        aggregations,
        aggregationFunctions,
      ),
      children,
    }
  })
}

/** Walks every node of a `buildGroupTree` tree, collecting each node's
 *  `pathKeyOf` key — used both to seed "every group starts collapsed" and
 *  to implement collapse-all, independent of what's currently expanded. */
export function collectGroupPaths<TRow extends GridValidRowModel>(
  nodes: ReadonlyArray<GroupTreeNode<TRow>>,
  into: Array<string> = [],
): Array<string> {
  for (const node of nodes) {
    into.push(pathKeyOf(node.path))
    if (node.children.kind === 'groups') {
      collectGroupPaths(node.children.nodes, into)
    }
  }
  return into
}

/** Flattens a `buildGroupTree` tree into the array the underlying grid
 *  renders, applying `collapsedPaths` (a node's children are omitted while
 *  its `pathKeyOf` key is in this set) and `aggregationPosition`. */
export function flattenGroupTree<TRow extends GridValidRowModel>(
  nodes: ReadonlyArray<GroupTreeNode<TRow>>,
  collapsedPaths: ReadonlySet<string>,
  aggregationPosition: AggregationPosition = 'inline',
): Array<GroupedRow<TRow>> {
  const flattened: Array<GroupedRow<TRow>> = []

  for (const node of nodes) {
    const key = pathKeyOf(node.path)
    const collapsed = collapsedPaths.has(key)

    flattened.push({
      id: `${GROUP_ROW_ID_PREFIX}${key}`,
      __isGroupRow: true,
      path: node.path,
      depth: node.depth,
      field: node.field,
      groupValue: node.value,
      count: node.count,
      aggregates: aggregationPosition === 'inline' ? node.aggregates : {},
    })

    if (!collapsed) {
      if (node.children.kind === 'groups') {
        flattened.push(
          ...flattenGroupTree(
            node.children.nodes,
            collapsedPaths,
            aggregationPosition,
          ),
        )
      } else {
        flattened.push(...node.children.rows)
      }
    }

    // A group-footer row is always emitted when `aggregationPosition` is
    // `'footer'`, regardless of collapse state — same precedent as the
    // dataset-wide grand-total footer always being visible.
    if (aggregationPosition === 'footer') {
      flattened.push({
        id: `${GROUP_FOOTER_ROW_ID_PREFIX}${key}`,
        __isGroupFooterRow: true,
        path: node.path,
        depth: node.depth,
        field: node.field,
        groupValue: node.value,
        aggregates: node.aggregates,
      })
    }
  }

  return flattened
}

/** Compares two raw field/aggregate/group values for sorting: numeric when
 *  both sides parse as finite numbers (`toFiniteNumber`), a case-insensitive
 *  string compare (`toComparable`) otherwise — the same two-track approach
 *  `matchesFilterItem` already takes per-operator, just without an operator
 *  here to signal which track applies up front. */
function compareSortValues(a: unknown, b: unknown): number {
  const aNumber = toFiniteNumber(a)
  const bNumber = toFiniteNumber(b)
  if (aNumber !== null && bNumber !== null) {
    return aNumber - bNumber
  }
  return toComparable(a).localeCompare(toComparable(b))
}

/** Reorders one node's real leaf rows by `sortModel.field`'s own raw value on
 *  each row — reached from `sortGroupTree` regardless of whether that field
 *  is also what reordered the group nodes above these rows, so expanding a
 *  group always shows its children in the active sort order, not just
 *  insertion order. */
function sortLeafRows<TRow extends GridValidRowModel>(
  rows: ReadonlyArray<TRow>,
  sortModel: SortModel,
): Array<TRow> {
  const direction = sortModel.sort === 'asc' ? 1 : -1
  return [...rows].sort(
    (a, b) =>
      direction * compareSortValues(a[sortModel.field], b[sortModel.field]),
  )
}

/** Reorders a `buildGroupTree` tree by one field, recursively — the
 *  group/child-counting-aware counterpart to the underlying grid's own
 *  column sorting, which this component deliberately never lets touch the
 *  already-flattened `pageRows` (`sortingMode="server"`, see the JSX below):
 *  sorting that flat group+leaf row array as one undifferentiated list has
 *  no way to keep a leaf row under its own group, which is exactly the
 *  scrambling this sorts the *tree* to avoid.
 *
 *  At each node array, siblings are only reordered when `sortModel.field` is
 *  something this level can actually compare without inventing data: either
 *  the `groupBy` field this level's own nodes were grouped by (compare by
 *  `node.value`, matching the chevron cell's own label — see
 *  `toGroupAwareColumn`) or a field in `aggregatedFields` (compare by
 *  `node.aggregates[field]`, matching what's actually shown on the group
 *  row/footer for it). A field that's neither (e.g. a leaf-only column with
 *  no aggregation configured for it) leaves this level's own order
 *  untouched — there is no single group-level value to sort by — but every
 *  node's children are still recursed into regardless, since a deeper level
 *  might group by that same field, or bottom out at real rows carrying it
 *  (handled by `sortLeafRows`). */
export function sortGroupTree<TRow extends GridValidRowModel>(
  nodes: ReadonlyArray<GroupTreeNode<TRow>>,
  sortModel: SortModel | null,
  aggregatedFields: ReadonlySet<string>,
): Array<GroupTreeNode<TRow>> {
  if (!sortModel) {
    return [...nodes]
  }

  const recursed = nodes.map((node) => ({
    ...node,
    children:
      node.children.kind === 'groups'
        ? {
            kind: 'groups' as const,
            nodes: sortGroupTree(
              node.children.nodes,
              sortModel,
              aggregatedFields,
            ),
          }
        : {
            kind: 'rows' as const,
            rows: sortLeafRows(node.children.rows, sortModel),
          },
  }))

  if (recursed.length === 0) {
    return recursed
  }
  const sortsByGroupValue = recursed[0].field === sortModel.field
  const sortsByAggregate = aggregatedFields.has(sortModel.field)
  if (!sortsByGroupValue && !sortsByAggregate) {
    return recursed
  }

  const direction = sortModel.sort === 'asc' ? 1 : -1
  return [...recursed].sort((a, b) => {
    const left = sortsByGroupValue ? a.value : a.aggregates[sortModel.field]
    const right = sortsByGroupValue ? b.value : b.aggregates[sortModel.field]
    return direction * compareSortValues(left, right)
  })
}

function isTopLevelGroupRow(row: unknown): boolean {
  return isGroupRow(row) && row.depth === 0
}

export interface PaginationRowRange {
  firstRowIndex: number
  lastRowIndex: number
}

/** Ports MUI X Premium's own `gridPaginationRowRangeSelector` (the
 *  algorithm behind its row-grouping-aware pagination) onto our flattened
 *  row array: `pageSize` caps only the count of *top-level* group rows
 *  (depth 0) included per page — every row between two included top-level
 *  rows (nested group rows, leaf rows, group-footer rows, at any depth)
 *  rides along for free, however many there are. Without this, expanding a
 *  group shifts page boundaries and eats into the budget meant for sibling
 *  top-level groups — the bug this ports Premium's fix for. Returns `null`
 *  when there is nothing to show (matching Premium's own selector). */
export function computeTopLevelPaginationRange<TRow extends GridValidRowModel>(
  flattenedRows: ReadonlyArray<GroupedRow<TRow>>,
  topLevelRowCount: number,
  page: number,
  pageSize: number,
): PaginationRowRange | null {
  if (flattenedRows.length === 0 || topLevelRowCount === 0) {
    return null
  }

  const topLevelFirstIndex = Math.min(pageSize * page, topLevelRowCount - 1)
  const topLevelLastIndex =
    pageSize === -1
      ? topLevelRowCount - 1
      : Math.min(topLevelFirstIndex + pageSize - 1, topLevelRowCount - 1)
  if (topLevelFirstIndex === -1 || topLevelLastIndex === -1) {
    return null
  }

  let firstRowIndex = -1
  let topLevelSeen = -1
  for (let index = 0; index < flattenedRows.length; index += 1) {
    if (isTopLevelGroupRow(flattenedRows[index])) {
      topLevelSeen += 1
      if (topLevelSeen === topLevelFirstIndex) {
        firstRowIndex = index
        break
      }
    }
  }
  if (firstRowIndex === -1) {
    return null
  }

  // Walks forward from the page's first top-level row, including every row
  // until (but not including) the top-level row that would exceed the
  // page's budget — same two-step shape as Premium's own selector: decide
  // whether to advance using the *current* `topLevelAdded`, then update it.
  const topLevelRowsInPage = topLevelLastIndex - topLevelFirstIndex + 1
  let lastRowIndex = firstRowIndex
  let topLevelAdded = 0
  while (
    lastRowIndex < flattenedRows.length &&
    topLevelAdded <= topLevelRowsInPage
  ) {
    const isTopLevel = isTopLevelGroupRow(flattenedRows[lastRowIndex])
    if (topLevelAdded < topLevelRowsInPage || !isTopLevel) {
      lastRowIndex += 1
    }
    if (isTopLevel) {
      topLevelAdded += 1
    }
  }

  return { firstRowIndex, lastRowIndex: lastRowIndex - 1 }
}

function toComparable(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime()
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

/** Evaluates one `GridFilterItem` against a single field value. Covers the
 *  operator set MUI X's own default string/number/date/boolean/singleSelect
 *  column types register (`contains`, `=`, `is`, `isAnyOf`, …) — the same
 *  operators the standard filter panel (reached from each column's header
 *  menu, unmodified by `GroupedDataTable` — see `toGroupAwareColumn`) lets a
 *  user pick. This is a from-scratch reimplementation rather than a call
 *  into MUI's own `column.filterOperators[…].getApplyFilterFn`: those
 *  functions require a live `apiRef` (they read
 *  `apiRef.current.getRowFormattedValue`), which only exists inside a
 *  mounted grid — unusable here, where filtering has to run on plain
 *  `TRow` data *before* a tree/page of rows is ever handed to the grid. An
 *  unrecognized operator (a consumer's own custom one) matches everything,
 *  the same conservative default `isRowMatchingFilters` style of fallback
 *  (fail open, not closed). */
function matchesFilterItem(value: unknown, item: GridFilterItem): boolean {
  switch (item.operator) {
    case 'contains':
      return toComparable(value).includes(toComparable(item.value))
    case 'doesNotContain':
      return !toComparable(value).includes(toComparable(item.value))
    case 'equals':
    case 'is':
      return toComparable(value) === toComparable(item.value)
    case 'doesNotEqual':
    case 'not':
      return toComparable(value) !== toComparable(item.value)
    case 'startsWith':
      return toComparable(value).startsWith(toComparable(item.value))
    case 'endsWith':
      return toComparable(value).endsWith(toComparable(item.value))
    case 'isEmpty':
      return value === null || value === undefined || value === ''
    case 'isNotEmpty':
      return !(value === null || value === undefined || value === '')
    case 'isAnyOf':
      return (
        Array.isArray(item.value) &&
        item.value.some(
          (option) => toComparable(value) === toComparable(option),
        )
      )
    case '=':
      return toFiniteNumber(value) === toFiniteNumber(item.value)
    case '!=':
      return toFiniteNumber(value) !== toFiniteNumber(item.value)
    case '>': {
      const left = toFiniteNumber(value)
      const right = toFiniteNumber(item.value)
      return left !== null && right !== null && left > right
    }
    case '>=': {
      const left = toFiniteNumber(value)
      const right = toFiniteNumber(item.value)
      return left !== null && right !== null && left >= right
    }
    case '<': {
      const left = toFiniteNumber(value)
      const right = toFiniteNumber(item.value)
      return left !== null && right !== null && left < right
    }
    case '<=': {
      const left = toFiniteNumber(value)
      const right = toFiniteNumber(item.value)
      return left !== null && right !== null && left <= right
    }
    case 'after': {
      const left = toTimestamp(value)
      const right = toTimestamp(item.value)
      return left !== null && right !== null && left > right
    }
    case 'onOrAfter': {
      const left = toTimestamp(value)
      const right = toTimestamp(item.value)
      return left !== null && right !== null && left >= right
    }
    case 'before': {
      const left = toTimestamp(value)
      const right = toTimestamp(item.value)
      return left !== null && right !== null && left < right
    }
    case 'onOrBefore': {
      const left = toTimestamp(value)
      const right = toTimestamp(item.value)
      return left !== null && right !== null && left <= right
    }
    default:
      return true
  }
}

/** Filter items actually in effect — an item whose `requiresFilterValue` the
 *  real grid would treat as `false` (`isEmpty`/`isNotEmpty`) always counts,
 *  since `matchesFilterItem` never reads `item.value` for those; every other
 *  item with a nullish/empty `value` is skipped (treated as not-yet-
 *  configured, same as the grid itself ignores an incomplete filter row in
 *  the panel). Shared by `rowMatchesFilterModel` (what actually filters) and
 *  `toFilterAwareColumn` (which column headers show the filter icon on) so
 *  the two never drift apart on what counts as "active". */
function activeFilterItems(
  filterModel: GridFilterModel,
): Array<GridFilterItem> {
  return filterModel.items.filter(
    (item) =>
      item.operator === 'isEmpty' ||
      item.operator === 'isNotEmpty' ||
      (item.value !== undefined && item.value !== null && item.value !== ''),
  )
}

/** A row matches the model if it matches every item (`logicOperator: 'and'`,
 *  the default) or at least one item (`'or'`) — mirroring
 *  `GridFilterModel`'s own documented semantics. */
function rowMatchesFilterModel<TRow extends GridValidRowModel>(
  row: TRow,
  filterModel: GridFilterModel,
): boolean {
  const activeItems = activeFilterItems(filterModel)
  if (activeItems.length === 0) {
    return true
  }

  const results = activeItems.map((item) =>
    matchesFilterItem(row[item.field], item),
  )
  return filterModel.logicOperator === 'or'
    ? results.some(Boolean)
    : results.every(Boolean)
}

/** Filters `rows` down to the ones matching `filterModel`, run *before*
 *  `buildGroupTree` rather than on the flattened grid rows. A `TRow` in
 *  this component carries its real `groupBy` field values (unlike MUI X
 *  Premium's auto-generated grouping column, which doesn't exist on a leaf
 *  row the same way) — so filtering leaves first and building the tree
 *  from what's left is already group-aware for free: a group with zero
 *  matching rows simply never gets a node, and one filtering on the
 *  `groupBy` field itself works the same way any other field does, no
 *  special-casing needed (contrast with Premium's own
 *  `filterRowTreeFromGroupingColumns`/`shouldApplyFilterItemOnGroup`, which
 *  exists specifically to paper over its synthetic grouping column not
 *  being a real field). */
export function filterRowsByModel<TRow extends GridValidRowModel>(
  rows: ReadonlyArray<TRow>,
  filterModel: GridFilterModel | undefined,
): Array<TRow> {
  if (!filterModel || filterModel.items.length === 0) {
    return [...rows]
  }
  return rows.filter((row) => rowMatchesFilterModel(row, filterModel))
}

/** Stands in for the live grid `row`/`apiRef` a `GridColDef['valueFormatter']`
 *  signature requires as its 2nd/4th arguments — same precedent as
 *  `EXPORT_API_REF` in GroupedDataTable.export.ts: an aggregate has no real
 *  `TRow` behind it (it's a computed sum/avg/etc. over a whole group), and
 *  every formatter in this codebase only reads its first ("value") argument
 *  (see `usePurchaseOrdersColumns.tsx`), so these stubs are never actually
 *  dereferenced. */
const AGGREGATE_API_REF = { current: null } as unknown as RefObject<GridApi>

/** Runs a column's own `valueFormatter` (if any) over one computed aggregate
 *  — without this, a group row's/footer's aggregated cell showed the raw
 *  number even when the same column's leaf rows were formatted (leaf cells
 *  go through `params.formattedValue`, which already applies it; the
 *  aggregate branches below previously returned `aggregates[field]`
 *  directly). */
function formatAggregateValue<TRow extends GridValidRowModel>(
  column: GridColDef<TRow>,
  row: unknown,
  value: number | undefined,
): number | string {
  if (value === undefined) {
    return ''
  }
  return column.valueFormatter
    ? column.valueFormatter(value as never, row as never, column, AGGREGATE_API_REF)
    : value
}

/** Wraps one consumer-provided column so the `groupBy` field(s) and any
 *  `aggregations` column know how to render a synthetic group row or
 *  group-footer row: at the field matching a group row's own level, it
 *  shows a chevron to expand/collapse plus `value (count)`, indented per
 *  nesting depth — a right-pointing chevron while collapsed, down while
 *  expanded, matching MUI X Premium's own grouping column
 *  (`GridKeyboardArrowRight`/`GridExpandMoreIcon` in
 *  `GridGroupingCriteriaCell`); at that same field on a group-footer row, it
 *  shows a `Subtotal <value>` label instead (no chevron — footer rows
 *  aren't collapsible); a column listed in `aggregations` shows its
 *  computed value; that same field is left blank on leaf rows instead of
 *  repeating the group value on every one of a group's rows.
 *
 *  Every *other* column (not a `groupBy` field, not aggregated — an
 *  `actions` column included) is returned completely untouched, for every
 *  row kind. This is deliberate, not an oversight: MUI X Premium itself
 *  doesn't restrict a column's own rendering on group rows either — a
 *  consumer wanting e.g. an action shown only on group rows writes that
 *  check (`isGroupRow`/`isGroupFooterRow` on `params.row`) into their own
 *  `getActions`/`renderCell`, the same way Premium's own demos branch on
 *  `params.rowNode.type`. See
 *  specs/03-grouped-data-table-actions-column.md. */
function toGroupAwareColumn<TRow extends GridValidRowModel>(
  column: GridColDef<TRow>,
  groupByFields: ReadonlyArray<string>,
  aggregatedFields: ReadonlySet<string>,
  collapsedPaths: ReadonlySet<string>,
  onToggleGroup: (key: string) => void,
): GridColDef<GroupedRow<TRow>> {
  const original = column as unknown as GridColDef<GroupedRow<TRow>>
  const isGroupedField = groupByFields.includes(column.field)
  const isAggregatedField = aggregatedFields.has(column.field)

  // A column that's neither a `groupBy` field nor aggregated has nothing
  // group-specific to show. A column with its own `getActions` (`type:
  // 'actions'`) or a custom `renderCell` (`type: 'boolean'`'s checkbox icon
  // included) is passed through completely untouched, for every row kind —
  // its own rendering already decides what to do with whatever `params.row`
  // it gets, the same `isGroupRow`/`isGroupFooterRow`-on-`params.row` escape
  // hatch MUI X Premium's own `params.rowNode.type` provides. See
  // specs/03-grouped-data-table-actions-column.md.
  //
  // A plain column with nothing but a `valueFormatter` (the common case —
  // every *_usePurchaseOrdersColumns.tsx-style column, e.g.) has no such
  // escape hatch: left untouched, MUI's own default cell rendering would run
  // `valueFormatter`/`valueGetter` straight against a synthetic
  // `GroupRow`/`GroupFooterRow`, which doesn't carry this field at all —
  // e.g. a `Math.round(value)`-based currency formatter renders the literal
  // text "$NaN" instead of blank. So it's blanked here on synthetic rows
  // instead, the same way an aggregated/grouped field already blanks itself
  // on the row kind it doesn't apply to.
  if (!isGroupedField && !isAggregatedField) {
    if (column.type === 'actions' || column.renderCell) {
      return original
    }
    return {
      ...original,
      renderCell: (params: GridRenderCellParams<GroupedRow<TRow>>) =>
        isGroupRow(params.row) || isGroupFooterRow(params.row)
          ? ''
          : params.formattedValue,
    }
  }

  return {
    ...original,
    // A `groupBy` field's column carries the expand/collapse chevron (below)
    // — hiding it via the columns panel (see `GroupedDataTableToolbar`)
    // would take that chevron with it, stranding every group permanently in
    // whatever collapse state it was last in. Forced here regardless of
    // whatever `hideable` the consumer's own column config set, since there
    // is no correct non-default value for a `groupBy` field. An aggregated
    // (but not grouped) field has no such restriction — it stays hideable.
    hideable: isGroupedField ? false : original.hideable,
    renderCell: (params: GridRenderCellParams<GroupedRow<TRow>>) => {
      const row = params.row

      if (isGroupFooterRow(row)) {
        if (isGroupedField && column.field === row.field) {
          return (
            <span
              className="grouped-data-table__group-footer-label"
              style={{ paddingLeft: row.depth * GROUP_INDENT_PX }}
            >
              {`Subtotal ${row.groupValue}`}
            </span>
          )
        }
        if (isAggregatedField) {
          return formatAggregateValue(column, row, row.aggregates[column.field])
        }
        return ''
      }

      if (isGroupRow(row)) {
        const group = row
        if (isGroupedField && column.field === group.field) {
          const key = pathKeyOf(group.path)
          const collapsed = collapsedPaths.has(key)
          return (
            <span
              className="grouped-data-table__group-cell"
              style={{ paddingLeft: group.depth * GROUP_INDENT_PX }}
            >
              <IconButton
                size="small"
                onClick={() => onToggleGroup(key)}
                aria-label={collapsed ? 'Expandir grupo' : 'Contraer grupo'}
                aria-expanded={!collapsed}
              >
                {collapsed ? (
                  <KeyboardArrowRightIcon fontSize="small" />
                ) : (
                  <KeyboardArrowDownIcon fontSize="small" />
                )}
              </IconButton>
              {`${group.groupValue} (${group.count})`}
            </span>
          )
        }
        if (isAggregatedField) {
          return formatAggregateValue(column, group, group.aggregates[column.field])
        }
        return ''
      }

      // Leaf row. `isGroupedField` is true here (the only other way into
      // this `renderCell`, `isAggregatedField`, falls through below) — its
      // value is already shown on every ancestor group row, so it's left
      // blank here instead of repeating on every one of a group's rows.
      if (isGroupedField) {
        return ''
      }
      return original.renderCell
        ? original.renderCell(params)
        : params.formattedValue
    },
  }
}

/** Wraps a column's header so a funnel icon appears next to its label while
 *  it has at least one active filter item (see `activeFilterItems`) —
 *  mirroring MUI X Premium's own row-grouping demo screenshot this was
 *  checked against (there, the "Commodity" and "Status" columns were marked
 *  while filtered; "Quantity"/"Filled Quantity"/"Unit Price", unfiltered,
 *  were not). Purely presentational: `filterRowsByModel` already drives the
 *  actual filtering regardless of whether this is wired in, so a missing
 *  icon would never hide an otherwise-correct filter, and vice versa. Chains
 *  onto whatever `renderHeader` the column already has (including one
 *  `toGroupAwareColumn` leaves untouched) rather than replacing it, the same
 *  "wrap, don't clobber" precedent that function's own doc comment
 *  explains. */
function toFilterAwareColumn<TRow extends GridValidRowModel>(
  column: GridColDef<GroupedRow<TRow>>,
  hasActiveFilter: boolean,
): GridColDef<GroupedRow<TRow>> {
  if (!hasActiveFilter) {
    return column
  }

  const originalRenderHeader = column.renderHeader
  const headerName = column.headerName ?? column.field

  return {
    ...column,
    renderHeader: (params: GridColumnHeaderParams<GroupedRow<TRow>>) => (
      <span className="grouped-data-table__header-label">
        {originalRenderHeader ? originalRenderHeader(params) : headerName}
        <FilterAltOutlinedIcon
          fontSize="small"
          className="grouped-data-table__header-filter-icon"
          titleAccess={`Columna "${headerName}" filtrada`}
        />
      </span>
    ),
  }
}

interface GroupedDataTableAggregationHeaderProps {
  headerName: string
  headerContent: ReactNode
  currentFn: string | undefined
  availableFunctions: ReadonlyArray<string>
  onSelect: (fn: string | null) => void
}

/** The actual header content `toAggregationAwareColumn` renders for one
 *  eligible column — a component of its own (not an inline closure in that
 *  function) so each column's menu `anchorEl` open/closed state is real
 *  React state that survives independently across re-renders, rather than
 *  being re-created from scratch on every `groupedColumns` recomputation.
 *  Mirrors MUI X Premium's own grouped-grid screenshots: the column's label
 *  stays on its own line, a small muted line under it names the active
 *  function (omitted entirely while unset, same as Premium shows nothing
 *  there for an unaggregated column), and a vertical-ellipsis icon button
 *  opens a menu to set/change/clear it — Premium's own version is a
 *  dropdown embedded in a larger "Sort/Pin/Filter/Aggregation/…" column
 *  menu; this is just the one section that's actually new behavior here —
 *  sort/pin/filter/manage columns are all already reachable through the
 *  grid's own default column menu (sorting also through a direct header
 *  click — see `sortGroupTree`), left untouched. */
function GroupedDataTableAggregationHeader({
  headerName,
  headerContent,
  currentFn,
  availableFunctions,
  onSelect,
}: GroupedDataTableAggregationHeaderProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  return (
    <span className="grouped-data-table__aggregation-header">
      <span className="grouped-data-table__aggregation-header-main">
        <span className="grouped-data-table__aggregation-header-label">
          {headerContent}
        </span>
        {currentFn && (
          <span className="grouped-data-table__aggregation-header-fn">
            {currentFn}
          </span>
        )}
      </span>
      <IconButton
        size="small"
        className="grouped-data-table__aggregation-header-trigger"
        // `'inherit'`, not the unset default (`'default'`) — same pitfall
        // `GroupedDataTableToolbar`'s own filter trigger already documents:
        // this project's theme (src/theme/index.ts) adds a literal
        // `palette.default` entry with `main: '#ffffff'`, and MUI's
        // `IconButton` resolves any colour prop (the unset default
        // included) straight off `theme.palette[color].main` — rendering
        // this icon fully white-on-white against the header background
        // otherwise, present and clickable but invisible. `'inherit'` picks
        // up the header's own text colour instead.
        color="inherit"
        // The grid's own header cell listens for clicks to drive sorting
        // (see `sortGroupTree`/`sortingMode="server"` below) — stopping
        // propagation keeps this button from also triggering that, the same
        // defensive guard any menu trigger nested inside a sortable header
        // needs.
        onClick={(event) => {
          event.stopPropagation()
          setAnchorEl(event.currentTarget)
        }}
        aria-label={`Opciones de agregación de "${headerName}"`}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          selected={!currentFn}
          onClick={() => {
            onSelect(null)
            setAnchorEl(null)
          }}
        >
          Sin agregación
        </MenuItem>
        {availableFunctions.map((fn) => (
          <MenuItem
            key={fn}
            selected={fn === currentFn}
            onClick={() => {
              onSelect(fn)
              setAnchorEl(null)
            }}
          >
            {fn}
          </MenuItem>
        ))}
      </Menu>
    </span>
  )
}

/** Wraps a numeric, non-`groupBy` column's header with the aggregation menu
 *  above — reachable for *every* eligible column regardless of whether
 *  it's currently aggregated (same as Premium, where every aggregable
 *  column's header offers the control, empty/`"…"` until one is picked),
 *  not just the ones already listed in `aggregations`. Picking a function
 *  is what adds (or changes, or — `"Sin agregación"` — removes) that
 *  field's entry in `GroupedDataTable`'s own aggregation model (see
 *  `handleColumnAggregationChange`), not just a display toggle. Chains onto
 *  whatever `renderHeader` the column already has (including one
 *  `toFilterAwareColumn`/`toGroupAwareColumn` leave untouched) rather than
 *  replacing it, the same "wrap, don't clobber" precedent those functions'
 *  own doc comments explain. */
function toAggregationAwareColumn<TRow extends GridValidRowModel>(
  column: GridColDef<GroupedRow<TRow>>,
  isEligible: boolean,
  currentFn: string | undefined,
  availableFunctions: ReadonlyArray<string>,
  onSelect: (field: string, fn: string | null) => void,
): GridColDef<GroupedRow<TRow>> {
  if (!isEligible) {
    return column
  }

  const originalRenderHeader = column.renderHeader
  const headerName = column.headerName ?? column.field

  return {
    ...column,
    renderHeader: (params: GridColumnHeaderParams<GroupedRow<TRow>>) => (
      <GroupedDataTableAggregationHeader
        headerName={headerName}
        headerContent={
          originalRenderHeader ? originalRenderHeader(params) : headerName
        }
        currentFn={currentFn}
        availableFunctions={availableFunctions}
        onSelect={(fn) => onSelect(column.field, fn)}
      />
    ),
  }
}

const GROUP_ROW_CLASS_NAME = 'grouped-data-table__group-row'
const GROUP_FOOTER_ROW_CLASS_NAME = 'grouped-data-table__group-footer-row'

/** Marks group rows and group-footer rows with their own class names
 *  (styled in `GroupedDataTable.css`, reusing `DataTable.css`'s tokens) so
 *  they read as distinct from real data rows. Delegates to the consumer's
 *  own `getRowClassName`, if any, for real rows. */
function toGroupAwareRowClassName<TRow extends GridValidRowModel>(
  original?: (params: GridRowClassNameParams<TRow>) => string,
) {
  return (params: GridRowClassNameParams<GroupedRow<TRow>>): string => {
    if (isGroupFooterRow(params.row)) {
      return GROUP_FOOTER_ROW_CLASS_NAME
    }
    if (isGroupRow(params.row)) {
      return GROUP_ROW_CLASS_NAME
    }
    return original ? original(params as GridRowClassNameParams<TRow>) : ''
  }
}

/** Group rows and group-footer rows aren't real records, so they're never
 *  selectable — even when `checkboxSelection` is on — regardless of the
 *  consumer's own `isRowSelectable`, which still governs real rows. */
function toGroupAwareIsRowSelectable<TRow extends GridValidRowModel>(
  original?: (params: GridRowParams<TRow>) => boolean,
) {
  return (params: GridRowParams<GroupedRow<TRow>>): boolean => {
    if (isGroupRow(params.row) || isGroupFooterRow(params.row)) {
      return false
    }
    return original ? original(params as GridRowParams<TRow>) : true
  }
}

/** Default `slots.toolbar` — visible buttons for the standard MUI X filter
 *  panel (`Column`/`Operator`/`Value`, the same panel reached from each
 *  column's own header menu — see `toGroupAwareColumn` and
 *  specs/04-grouped-data-table-filtering.md) and the standard MUI X columns
 *  panel (show/hide per column, search, "Show/Hide All", "Reset" — the same
 *  panel reached from each column's own header menu's "Manage columns"
 *  item). Each column's header menu already offers both regardless, but
 *  that's a hover-to-reveal per-column control; without a toolbar there is
 *  no always-visible icon for either feature at all, which is the gap this
 *  closes. Built from MUI X's own non-deprecated `FilterPanelTrigger`/
 *  `ColumnsPanelTrigger`/`Toolbar`/`ToolbarButton` primitives — the same ones
 *  its own default `GridToolbar` composes from — rather than MUI's full
 *  default toolbar, which also bundles quick/global-text search (a separate
 *  filtering path from `filterModel`, one `filterRowsByModel` doesn't
 *  implement — enabling it would add a visible control that silently does
 *  nothing). The columns panel itself (`slots.columnsPanel`) is left at MUI
 *  X's own default (`GridColumnsPanel`/`GridColumnsManagement`) rather than a
 *  custom one, unlike the filter panel — Community's column-visibility
 *  model has no restriction comparable to the forced single-item
 *  `filterModel` that necessitated `GroupedDataTableFilterPanel`. The one
 *  guard actually needed — hiding a `groupBy` field's column would take its
 *  expand/collapse chevron with it — is applied directly on that column via
 *  `hideable: false` in `toGroupAwareColumn`, which disables (rather than
 *  removes) its row in the panel, same as MUI X Premium's own screenshots
 *  show for a non-hideable column. `showToolbar` must also be `true` for any
 *  `slots.toolbar` to render at all — defaulted alongside this below.
 *
 *  The download button (`onPrint`/`onExportCsv`/`onExportExcel`, from
 *  `GroupedDataTable`'s own export handlers via `slotProps.toolbar`) mirrors
 *  MUI X Premium's own toolbar export menu — "Print"/"Download as CSV"/
 *  "Download as Excel" — rebuilt here the same reason the rest of this
 *  toolbar is: row-grouping/aggregation-aware export isn't available in
 *  Community `@mui/x-data-grid` either. See GroupedDataTable.export.ts. */
function GroupedDataTableToolbar({
  filterCount,
  onPrint,
  onExportCsv,
  onExportExcel,
}: ToolbarPropsOverrides) {
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null)

  return (
    <Toolbar>
      <Tooltip title="Columnas">
        <ColumnsPanelTrigger
          render={(triggerProps) => (
            <ToolbarButton
              // See the matching cast on the filter trigger below for why
              // this is needed.
              {...(triggerProps as ComponentProps<typeof ToolbarButton>)}
              color="inherit"
            >
              <ViewColumnIcon fontSize="small" />
            </ToolbarButton>
          )}
        />
      </Tooltip>
      <Tooltip title="Filtros">
        <FilterPanelTrigger
          render={(triggerProps) => (
            <ToolbarButton
              // `triggerProps` is typed against the generic `baseButton`
              // slot (`FilterPanelTriggerProps`), not the `baseIconButton`
              // slot `ToolbarButton` itself renders — MUI X's own
              // `GridToolbar` spreads it the same way internally. The cast
              // is needed because this project's theme adds a `'neutral'`
              // button color MUI's `baseButton`/`baseIconButton` color
              // unions don't agree on; it doesn't change what's actually
              // passed through at runtime.
              {...(triggerProps as ComponentProps<typeof ToolbarButton>)}
              // `'inherit'`, not `'default'`, for the no-active-filter state:
              // this project's theme (src/theme/index.ts) adds a literal
              // `palette.default` entry (a dedicated colour for
              // `<Button color="default">`, with `main: '#ffffff'` in both
              // light and dark schemes) — but MUI's `IconButton` resolves
              // *any* colour prop, including `'default'`, straight off
              // `theme.palette[color].main` (see `@mui/material/IconButton`'s
              // own style variants), not off its usual built-in grey
              // `action.active`. That made this icon render fully white —
              // invisible against the white toolbar background in both
              // schemes — the instant `filterCount` dropped back to 0 (e.g.
              // "Eliminar todos" in the filter panel), with no visual trace
              // left to click to reopen the panel. `'inherit'` has its own
              // dedicated variant in `IconButton` (`color: 'inherit'`) that
              // isn't affected by the palette, and picks up the Toolbar's
              // own foreground colour instead — always visible.
              color={filterCount > 0 ? 'primary' : 'inherit'}
            >
              {/* `filterCount` comes from `GroupedDataTable`'s own
                  `filterModel` state via `slotProps.toolbar`, not the
                  trigger's own `state.filterCount` — that one reflects the
                  underlying grid's internal filter state, which this
                  component deliberately never receives a real multi-item
                  `filterModel` to mirror (see the `filterModel` comment in
                  `GroupedDataTable`'s own JSX). */}
              <Badge badgeContent={filterCount} color="primary" variant="dot">
                <FilterListIcon fontSize="small" />
              </Badge>
            </ToolbarButton>
          )}
        />
      </Tooltip>
      <Tooltip title="Descargar">
        <ToolbarButton
          color="inherit"
          onClick={(event) => setExportAnchorEl(event.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={Boolean(exportAnchorEl)}
        >
          <DownloadIcon fontSize="small" />
        </ToolbarButton>
      </Tooltip>
      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={() => setExportAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            setExportAnchorEl(null)
            onPrint()
          }}
        >
          Descargar como PDF
        </MenuItem>
        <MenuItem
          onClick={() => {
            setExportAnchorEl(null)
            onExportCsv()
          }}
        >
          Descargar como CSV
        </MenuItem>
        <MenuItem
          onClick={() => {
            setExportAnchorEl(null)
            onExportExcel()
          }}
        >
          Descargar como Excel
        </MenuItem>
      </Menu>
    </Toolbar>
  )
}

/** A column's resolved "kind" for filtering purposes — which operator set
 *  (`FILTER_OPERATORS_BY_KIND`) and value-input type
 *  `GroupedDataTableFilterPanel` offers for it. Derived from `GridColDef['type']`
 *  the same way MUI's own column-type-to-operator-defaults resolution is,
 *  just with a closed set of outcomes instead of arbitrary custom types. */
export type FilterColumnKind =
  'string' | 'number' | 'date' | 'dateTime' | 'boolean'

function filterColumnKind(column: GridColDef): FilterColumnKind {
  switch (column.type) {
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    case 'dateTime':
      return 'dateTime'
    case 'boolean':
      return 'boolean'
    default:
      return 'string'
  }
}

interface FilterOperatorOption {
  value: string
  label: string
  /** @default true */
  requiresValue?: boolean
}

// Spanish labels, hand-picked rather than read from MUI's own
// `getLocaleText('filterOperator…')` — those resolve at render time inside
// MUI's own filter form, which this panel doesn't use (see
// `GroupedDataTableFilterPanel`'s own doc comment for why). The operator
// *values* are the same ones `matchesFilterItem` already implements —
// picking one here always matches a case that function actually handles.
const FILTER_OPERATORS_BY_KIND: Record<
  FilterColumnKind,
  ReadonlyArray<FilterOperatorOption>
> = {
  string: [
    { value: 'contains', label: 'contiene' },
    { value: 'doesNotContain', label: 'no contiene' },
    { value: 'equals', label: 'es igual a' },
    { value: 'doesNotEqual', label: 'no es igual a' },
    { value: 'startsWith', label: 'empieza con' },
    { value: 'endsWith', label: 'termina con' },
    { value: 'isEmpty', label: 'está vacío', requiresValue: false },
    { value: 'isNotEmpty', label: 'no está vacío', requiresValue: false },
  ],
  number: [
    { value: '=', label: '=' },
    { value: '!=', label: '≠' },
    { value: '>', label: '>' },
    { value: '>=', label: '≥' },
    { value: '<', label: '<' },
    { value: '<=', label: '≤' },
    { value: 'isEmpty', label: 'está vacío', requiresValue: false },
    { value: 'isNotEmpty', label: 'no está vacío', requiresValue: false },
  ],
  date: [
    { value: 'is', label: 'es' },
    { value: 'not', label: 'no es' },
    { value: 'after', label: 'después de' },
    { value: 'onOrAfter', label: 'en o después de' },
    { value: 'before', label: 'antes de' },
    { value: 'onOrBefore', label: 'en o antes de' },
    { value: 'isEmpty', label: 'está vacío', requiresValue: false },
    { value: 'isNotEmpty', label: 'no está vacío', requiresValue: false },
  ],
  dateTime: [
    { value: 'is', label: 'es' },
    { value: 'not', label: 'no es' },
    { value: 'after', label: 'después de' },
    { value: 'onOrAfter', label: 'en o después de' },
    { value: 'before', label: 'antes de' },
    { value: 'onOrBefore', label: 'en o antes de' },
    { value: 'isEmpty', label: 'está vacío', requiresValue: false },
    { value: 'isNotEmpty', label: 'no está vacío', requiresValue: false },
  ],
  boolean: [{ value: 'is', label: 'es' }],
}

interface GroupedDataTableFilterContextValue {
  filterableColumns: Array<{
    field: string
    headerName: string
    kind: FilterColumnKind
  }>
  filterModel: GridFilterModel
  onFilterModelChange: (model: GridFilterModel) => void
}

/** Carries live `filterModel`/`filterableColumns`/`onFilterModelChange` to
 *  `GroupedDataTableFilterPanel` — *not* `slotProps.filterPanel`, despite
 *  that being the normal way to hand data to a slot (and how
 *  `GroupedDataTableFooter`/`GroupedDataTableToolbar` still do it). MUI X's
 *  own `preferencePanelPreProcessing` renders `slots.filterPanel` through a
 *  pipe processor gated on the preference panel's open/closed state, not on
 *  every `GroupedDataTable` render — confirmed by instrumenting an actual
 *  render in a real browser (not just the jsdom-based tests, which never
 *  surfaced this): clicking a panel control fires the handler and
 *  `GroupedDataTable`'s own `filterModel` genuinely updates (used
 *  correctly elsewhere, e.g. `filterRowsByModel`/the footer), but the
 *  *already-rendered* `<FilterPanel {...slotProps.filterPanel}>` element
 *  keeps the `filterModel` it had when the panel first opened — passing
 *  fresh values through `slotProps` on a later render never reaches it.
 *  Context sidesteps this: a consumer re-renders when the *value its
 *  provider passes* changes, regardless of whether its own parent-given
 *  props did. */
const GroupedDataTableFilterContext =
  createContext<GroupedDataTableFilterContextValue | null>(null)

/** Default `slots.filterPanel` — lets `filterModel` carry more than one
 *  item, which MUI X Community's own `GridFilterPanel` cannot: the
 *  underlying `<DataGrid>` unconditionally forces
 *  `disableMultipleColumnsFiltering: true` (confirmed in its own
 *  `DATA_GRID_FORCED_PROPS`), which both hides its "+ ADD FILTER"/
 *  "REMOVE ALL" controls *and* makes every `setFilterModel` call truncate
 *  `items` to one, logging a console error once a second item exists —
 *  true regardless of which component asks for it, including this
 *  component's own controlled-prop sync, which is exactly why
 *  `GroupedDataTable` never passes `filterModel` to the underlying
 *  `<DataTable>` at all (see that comment in its JSX). This panel reads and
 *  writes `filterModel` through `GroupedDataTableFilterContext` instead —
 *  wired directly to `GroupedDataTable`'s own state, bypassing the grid
 *  (and that restriction, and the stale-slotProps pitfall the context's own
 *  doc comment explains) completely. One row per `GridFilterItem`: a
 *  delete button, a column select, an operator select (from
 *  `FILTER_OPERATORS_BY_KIND`, keyed by `filterColumnKind`), and a value
 *  input where the selected operator needs one — plus "Agregar filtro" and
 *  "Eliminar todos" buttons, and an AND/OR toggle once there's more than
 *  one row. Every operation addresses an item by its position in
 *  `filterModel.items` rather than `item.id` — `GridFilterItem.id` is
 *  optional, and a model seeded from `initialState.filter.filterModel`
 *  (or set by a consumer directly) commonly omits it; matching by a
 *  possibly-`undefined`/possibly-duplicated id would make delete/edit
 *  target the wrong row (or every id-less row at once). See
 *  specs/04-grouped-data-table-filtering.md. */
function GroupedDataTableFilterPanel() {
  const context = useContext(GroupedDataTableFilterContext)
  if (!context) {
    return null
  }
  const { filterableColumns, filterModel, onFilterModelChange } = context

  const columnByField = useMemo(
    () => new Map(filterableColumns.map((column) => [column.field, column])),
    [filterableColumns],
  )

  const updateItems = useCallback(
    (items: Array<GridFilterItem>) => {
      onFilterModelChange({ ...filterModel, items })
    },
    [filterModel, onFilterModelChange],
  )

  const handleAddFilter = useCallback(() => {
    const firstColumn = filterableColumns.at(0)
    if (!firstColumn) {
      return
    }
    const firstOperator = FILTER_OPERATORS_BY_KIND[firstColumn.kind][0]
    updateItems([
      ...filterModel.items,
      {
        field: firstColumn.field,
        operator: firstOperator.value,
        value: undefined,
      },
    ])
  }, [filterableColumns, filterModel.items, updateItems])

  const handleRemoveFilter = useCallback(
    (index: number) => {
      updateItems(
        filterModel.items.filter((_, itemIndex) => itemIndex !== index),
      )
    },
    [filterModel.items, updateItems],
  )

  const handleRemoveAll = useCallback(() => {
    updateItems([])
  }, [updateItems])

  const handleFieldChange = useCallback(
    (index: number, field: string) => {
      const column = columnByField.get(field)
      const operator = column
        ? FILTER_OPERATORS_BY_KIND[column.kind][0]
        : undefined
      updateItems(
        filterModel.items.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                field,
                operator: operator?.value ?? item.operator,
                value: undefined,
              }
            : item,
        ),
      )
    },
    [columnByField, filterModel.items, updateItems],
  )

  const handleOperatorChange = useCallback(
    (index: number, operator: string) => {
      updateItems(
        filterModel.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, operator, value: undefined } : item,
        ),
      )
    },
    [filterModel.items, updateItems],
  )

  const handleValueChange = useCallback(
    (index: number, value: unknown) => {
      updateItems(
        filterModel.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, value } : item,
        ),
      )
    },
    [filterModel.items, updateItems],
  )

  const handleLogicOperatorChange = useCallback(
    (logicOperator: GridLogicOperator) => {
      onFilterModelChange({ ...filterModel, logicOperator })
    },
    [filterModel, onFilterModelChange],
  )

  return (
    <div className="grouped-data-table__filter-panel">
      {filterModel.items.length === 0 && (
        <Typography
          variant="body2"
          className="grouped-data-table__filter-panel-empty"
        >
          Sin filtros activos
        </Typography>
      )}
      <div className="grouped-data-table__filter-panel-items">
        {filterModel.items.map((item, index) => {
          const column = columnByField.get(item.field)
          const kind = column?.kind ?? 'string'
          const operators = FILTER_OPERATORS_BY_KIND[kind]
          // `operators` is never empty — every `FilterColumnKind` has at
          // least one entry in `FILTER_OPERATORS_BY_KIND` — so falling back
          // to `operators[0]` always yields a real operator, not `undefined`.
          const selectedOperator =
            operators.find((operator) => operator.value === item.operator) ??
            operators[0]
          const requiresValue = selectedOperator.requiresValue !== false

          return (
            // `item.id` is optional on `GridFilterItem` and commonly absent
            // (e.g. an `initialState.filter.filterModel` seed) — falling
            // back to `index` keeps the key defined and unique the same way
            // every handler below addresses this row by `index`, not `id`.
            <div
              className="grouped-data-table__filter-panel-row"
              key={item.id ?? index}
            >
              <IconButton
                size="small"
                onClick={() => handleRemoveFilter(index)}
                aria-label="Eliminar filtro"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              {/* `filterModel.logicOperator` is one value for the whole
                  model, not per-pair — MUI X Premium's own panel still
                  shows it on every row from the second on, editable on the
                  first of those and disabled (mirroring the same value) on
                  any after it, which is what this reproduces. Row 0 gets a
                  same-width empty spacer instead, so the Column/Operator/
                  Value columns stay aligned across every row. */}
              {index === 0 ? (
                <span
                  className="grouped-data-table__filter-panel-logic-spacer"
                  aria-hidden="true"
                />
              ) : (
                <Select
                  size="small"
                  value={filterModel.logicOperator ?? GridLogicOperator.And}
                  onChange={(event) =>
                    handleLogicOperatorChange(event.target.value)
                  }
                  disabled={index > 1}
                  aria-label="Operador lógico"
                  className="grouped-data-table__filter-panel-logic"
                >
                  <MenuItem value={GridLogicOperator.And}>Y</MenuItem>
                  <MenuItem value={GridLogicOperator.Or}>O</MenuItem>
                </Select>
              )}
              <Select
                size="small"
                value={item.field}
                onChange={(event) =>
                  handleFieldChange(index, event.target.value)
                }
                aria-label="Columna"
              >
                {filterableColumns.map((filterableColumn) => (
                  <MenuItem
                    key={filterableColumn.field}
                    value={filterableColumn.field}
                  >
                    {filterableColumn.headerName}
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={selectedOperator.value}
                onChange={(event) =>
                  handleOperatorChange(index, event.target.value)
                }
                aria-label="Operador"
              >
                {operators.map((operator) => (
                  <MenuItem key={operator.value} value={operator.value}>
                    {operator.label}
                  </MenuItem>
                ))}
              </Select>
              {requiresValue && kind === 'boolean' && (
                <Select
                  size="small"
                  displayEmpty
                  value={
                    item.value === true
                      ? 'true'
                      : item.value === false
                        ? 'false'
                        : ''
                  }
                  onChange={(event) =>
                    handleValueChange(index, event.target.value === 'true')
                  }
                  aria-label="Valor"
                >
                  <MenuItem value="">—</MenuItem>
                  <MenuItem value="true">Verdadero</MenuItem>
                  <MenuItem value="false">Falso</MenuItem>
                </Select>
              )}
              {requiresValue && kind !== 'boolean' && (
                <TextField
                  size="small"
                  type={
                    kind === 'number'
                      ? 'number'
                      : kind === 'date'
                        ? 'date'
                        : kind === 'dateTime'
                          ? 'datetime-local'
                          : 'text'
                  }
                  value={item.value ?? ''}
                  onChange={(event) =>
                    handleValueChange(index, event.target.value)
                  }
                  placeholder="Valor del filtro"
                  slotProps={{ htmlInput: { 'aria-label': 'Valor' } }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="grouped-data-table__filter-panel-actions">
        <Button
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={handleAddFilter}
          disabled={filterableColumns.length === 0}
        >
          Agregar filtro
        </Button>
        <Button
          size="small"
          color="error"
          startIcon={<DeleteForeverIcon fontSize="small" />}
          onClick={handleRemoveAll}
          disabled={filterModel.items.length === 0}
        >
          Eliminar todos
        </Button>
      </div>
    </div>
  )
}

/** Replaces the grid's default footer (`slots.footer`) so the grand-total
 *  summary and the expand-all/collapse-all toggle sit in the same row as
 *  the pagination controls — `GridFooter` itself always renders its own
 *  fixed content, so this recomposes `GridFooterContainer` (the same flex
 *  row, `justify-content: space-between`) with our totals on one side and
 *  `GridPagination` on the other, matching `rootProps.hideFooterPagination`
 *  the way the default footer does. `groupCount`/`grandTotals`/etc. arrive
 *  via `slotProps.footer`, typed through the `FooterPropsOverrides`
 *  augmentation above. */
function GroupedDataTableFooter({
  groupCount,
  grandTotals,
  aggregations,
  columnByField,
  onExpandAll,
  onCollapseAll,
  ...containerProps
}: GridFooterContainerProps & FooterPropsOverrides) {
  const rootProps = useGridRootProps()

  return (
    <GridFooterContainer {...containerProps}>
      <div className="grouped-data-table__totals">
        {groupCount > 0 && (
          <span className="grouped-data-table__bulk-toggle">
            <IconButton
              size="small"
              onClick={onExpandAll}
              aria-label="Expandir todos los grupos"
            >
              <UnfoldMoreIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={onCollapseAll}
              aria-label="Contraer todos los grupos"
            >
              <UnfoldLessIcon fontSize="small" />
            </IconButton>
          </span>
        )}
        <Typography
          variant="body2"
          component="span"
          className="grouped-data-table__totals-item"
        >
          Total de grupos: {groupCount}
        </Typography>
        {aggregations.map((aggregation) => {
          const column = columnByField.get(aggregation.field)
          return (
            <Typography
              key={aggregation.field}
              variant="body2"
              component="span"
              className="grouped-data-table__totals-item"
            >
              Total {column?.headerName ?? aggregation.field}:{' '}
              {column
                ? formatAggregateValue(
                    column,
                    undefined,
                    grandTotals[aggregation.field],
                  )
                : grandTotals[aggregation.field]}
            </Typography>
          )
        })}
      </div>
      {rootProps.pagination && !rootProps.hideFooterPagination && (
        <GridPagination />
      )}
    </GridFooterContainer>
  )
}

/** Groups rows by one or several `groupBy` fields (nested, outer to inner)
 *  and shows a configurable per-column aggregation — inline on each group's
 *  own row, or as a dedicated subtotal row — on top of the existing
 *  `DataTable`. `checkboxSelection` defaults to `false` here (`DataTable`
 *  defaults it to `true`), matching MUI X Premium's own row-grouping demos,
 *  which don't opt into it either — pass `checkboxSelection` explicitly to
 *  turn it back on. `showToolbar` defaults to `true` (`DataGrid` itself
 *  defaults it to `false`) so the filter trigger in `GroupedDataTableToolbar`
 *  is always visible — pass `showToolbar={false}`, or your own
 *  `slots.toolbar`, to change that. See specs/01-grouped-data-table.md,
 *  specs/02-grouped-data-table-advanced-grouping.md, and
 *  specs/04-grouped-data-table-filtering.md. */
const GroupedDataTable = <TRow extends GridValidRowModel>({
  className,
  groupBy,
  aggregations: aggregationsProp,
  onAggregationsChange: onAggregationsChangeProp,
  aggregationFunctions: aggregationFunctionsProp,
  aggregationPosition = 'inline',
  exportFileName = 'datos',
  tableTitle,
  // Bumped only while at least one column is actually aggregated (see
  // `columnHeaderHeight` below) — the extra few pixels a second header line
  // (the active-function label, `GroupedDataTableAggregationHeader`) needs
  // that `DataGrid`'s own default `columnHeaderHeight` (56) doesn't budget
  // for. Pulled out of `props` so a consumer's own explicit value always
  // wins over that default, the same escape hatch `paginationModel`/
  // `filterModel` below already use for their own props.
  columnHeaderHeight: columnHeaderHeightProp,
  // `DataGridProps['rows']` is publicly optional (MUI defaults it to `[]`
  // internally) even though this app always passes it explicitly.
  rows = [],
  columns,
  getRowClassName,
  isRowSelectable,
  // `checkboxSelection` defaults to `false` here, overriding `DataTable`'s
  // own default of `true` — `checkboxSelection` isn't on by default in any
  // tier of MUI X's own DataGrid (Community/Pro/Premium all default it to
  // `false`; verified in `@mui/x-data-grid`'s own prop defaults), and its
  // own row-grouping demos simply don't opt into it, which is why they read
  // as checkbox-free. A consumer can still opt back in explicitly.
  checkboxSelection = false,
  // `showToolbar` defaults to `true` here, overriding `DataGrid`'s own
  // default of `false` — otherwise the only way to reach filtering is a
  // hover-to-reveal column-header menu, with no visible icon/button
  // anywhere for the feature. See `GroupedDataTableToolbar`.
  showToolbar = true,
  // Pagination is taken over entirely by this component (see
  // `computeTopLevelPaginationRange`) instead of being left to the
  // underlying grid's own row-count-based slicing — pulled out of `props`
  // so they're never spread through untouched.
  paginationModel: paginationModelProp,
  onPaginationModelChange: onPaginationModelChangeProp,
  // Same reasoning, for filtering (see `filterRowsByModel`): the grid must
  // not filter the already-tree-flattened `rows` it receives itself.
  filterModel: filterModelProp,
  onFilterModelChange: onFilterModelChangeProp,
  // Same reasoning again, for sorting (see `sortGroupTree`): the grid must
  // not sort the already-flattened `pageRows` itself — that would scramble
  // group/child pairing, since a plain flat sort has no concept of "stay
  // under your own group". Unlike `filterModel`, these two *are* still
  // passed straight through to the underlying `<DataTable>` below — see the
  // `sortingMode="server"` comment in the JSX for why that's safe here
  // where it wasn't for `filterModel`.
  sortModel: sortModelProp,
  onSortModelChange: onSortModelChangeProp,
  initialState,
  ...props
}: GroupedDataTableProps<TRow>) => {
  const normalizedGroupBy = Array.isArray(groupBy) ? groupBy.join('>') : groupBy
  const groupByFields = useMemo<Array<string>>(
    () => (Array.isArray(groupBy) ? [...groupBy] : [groupBy]),
    // `groupBy` is config the consumer is expected to keep referentially
    // stable (or memoized) across renders, same as `columns`/`aggregations`
    // on the original component — depending on a joined string instead of
    // the array/value itself avoids rebuilding the tree on every render
    // when a consumer passes an inline array literal.
    [normalizedGroupBy],
  )

  const aggregationFunctions = useMemo(
    () => ({ ...DEFAULT_AGGREGATION_FUNCTIONS, ...aggregationFunctionsProp }),
    [aggregationFunctionsProp],
  )

  // Deliberately *not* the same controlled/uncontrolled split as
  // `paginationModel`/`filterModel` below (which treat the prop itself,
  // whenever it's given, as authoritative — see the `filterModel` comment
  // on the underlying `<DataTable>` in the JSX for why that pattern exists
  // there). `aggregations` had no change-reporting counterpart at all
  // before this header menu existed, and every call site in this codebase
  // (every story, most real usage) already passes it as a plain literal
  // with no handler — if presence of the prop alone made it controlled,
  // picking a function from the menu would silently do nothing for all of
  // them, re-deriving the exact same array from the frozen prop on every
  // render. So control instead hinges on `onAggregationsChange`: without
  // it, `aggregations` only *seeds* this internal state (read once, like
  // `initialState`) and every menu selection updates it directly — a
  // consumer passing `aggregations` alone still gets a fully working menu.
  // Passing `onAggregationsChange` *is* the opt-in to own/persist the
  // model: once given, the live `aggregationsProp` value wins every render
  // and a selection only ever reaches this component's own rendering by
  // round-tripping back through that callback into a new `aggregations`
  // prop value, same as any other controlled React input.
  const isAggregationsControlled = onAggregationsChangeProp !== undefined
  const [uncontrolledAggregations, setUncontrolledAggregations] = useState<
    Array<ColumnAggregation<TRow>>
  >(() => aggregationsProp ?? [])
  const aggregations = isAggregationsControlled
    ? (aggregationsProp ?? [])
    : uncontrolledAggregations
  const handleAggregationsChange = useCallback(
    (next: Array<ColumnAggregation<TRow>>) => {
      if (!isAggregationsControlled) {
        setUncontrolledAggregations(next)
      }
      onAggregationsChangeProp?.(next)
    },
    [isAggregationsControlled, onAggregationsChangeProp],
  )

  // Called by `GroupedDataTableAggregationHeader`'s own menu (via
  // `toAggregationAwareColumn`) — `fn: null` ("Sin agregación") removes
  // `field`'s entry entirely rather than setting it to some sentinel
  // function, so an unaggregated column goes back to rendering blank on
  // group rows exactly like one that was never in `aggregations` to begin
  // with (`toGroupAwareColumn`'s `isAggregatedField` check).
  const handleColumnAggregationChange = useCallback(
    (field: string, fn: string | null) => {
      const withoutField = aggregations.filter(
        (aggregation) => aggregation.field !== field,
      )
      handleAggregationsChange(
        fn === null ? withoutField : [...withoutField, { field, fn }],
      )
    },
    [aggregations, handleAggregationsChange],
  )

  // Built-in names first, in their natural order, then any custom names a
  // consumer's own `aggregationFunctions` adds — offered, in this order, in
  // every eligible column header's aggregation menu.
  const availableAggregationFunctionNames = useMemo(() => {
    const builtinOrder: ReadonlyArray<AggregationFn> = [
      'sum',
      'count',
      'avg',
      'min',
      'max',
    ]
    const names = Object.keys(aggregationFunctions)
    const builtinNames = builtinOrder.filter((name) => names.includes(name))
    const customNames = names.filter(
      (name) => !(builtinOrder as ReadonlyArray<string>).includes(name),
    )
    return [...builtinNames, ...customNames]
  }, [aggregationFunctions])

  // `DataTable`'s own default page size (10), used only to seed state when
  // neither `paginationModel` nor `initialState.pagination.paginationModel`
  // is given — matches what a consumer would see from `DataTable` itself.
  // `initialState`'s own `paginationModel` is a `Partial`, so both fields
  // are defaulted explicitly rather than assumed present. Declared ahead of
  // the filtering state below so changing the filter can reset the page.
  const [uncontrolledPaginationModel, setUncontrolledPaginationModel] =
    useState<GridPaginationModel>(() => ({
      page: 0,
      pageSize: 10,
      ...initialState?.pagination?.paginationModel,
      ...paginationModelProp,
    }))
  // Standard controlled/uncontrolled split: a consumer passing their own
  // `paginationModel` (with `onPaginationModelChange`) drives this directly,
  // same as they would with a plain `DataTable`/`DataGrid`.
  const paginationModel = paginationModelProp ?? uncontrolledPaginationModel
  const handlePaginationModelChange = useCallback(
    (
      model: GridPaginationModel,
      details: Parameters<
        NonNullable<DataTableProps<TRow>['onPaginationModelChange']>
      >[1],
    ) => {
      if (paginationModelProp === undefined) {
        setUncontrolledPaginationModel(model)
      }
      onPaginationModelChangeProp?.(model, details)
    },
    [paginationModelProp, onPaginationModelChangeProp],
  )

  // Same controlled/uncontrolled split as pagination, defaulting to no
  // active filters.
  const [uncontrolledFilterModel, setUncontrolledFilterModel] =
    useState<GridFilterModel>(
      () =>
        filterModelProp ?? initialState?.filter?.filterModel ?? { items: [] },
    )
  const filterModel = filterModelProp ?? uncontrolledFilterModel
  // Called only by `GroupedDataTableFilterPanel`'s own controls — *not*
  // wired as the underlying `<DataTable>`'s `onFilterModelChange` (see the
  // comment above that prop in the JSX below for why: Community's `DataGrid`
  // unconditionally truncates a multi-item `filterModel` prop to one item
  // and logs a console error doing it). Since there is no real grid-
  // dispatched event behind this call, `details` is a type-satisfying stub,
  // not real `GridCallbackDetails` — no consumer in this codebase reads
  // `details.api`/`details.apiRef` from `onFilterModelChange`.
  const handleFilterModelChange = useCallback(
    (model: GridFilterModel) => {
      if (filterModelProp === undefined) {
        setUncontrolledFilterModel(model)
      }
      // A new filter can shrink the result to fewer pages than the one the
      // user was on — reset to the first page, same expectation a plain
      // `DataGrid` meets on its own in client filter mode. Only done for
      // uncontrolled pagination: a consumer driving `paginationModel`
      // themselves owns that decision.
      if (paginationModelProp === undefined) {
        setUncontrolledPaginationModel((prev) => ({ ...prev, page: 0 }))
      }
      onFilterModelChangeProp?.(
        model,
        {} as Parameters<
          NonNullable<DataTableProps<TRow>['onFilterModelChange']>
        >[1],
      )
    },
    [filterModelProp, paginationModelProp, onFilterModelChangeProp],
  )

  // Same controlled/uncontrolled split as pagination/filtering, defaulting
  // to no active sort. Unlike `filterModel`, this one is also handed
  // straight through to the underlying `<DataTable>` below (see the
  // `sortModel`/`onSortModelChange` JSX props) — Community's `DataGrid` has
  // no restriction on a single-item controlled `sortModel` the way it forces
  // `disableMultipleColumnsFiltering` on `filterModel`, so there's no need
  // for `GroupedDataTableFilterContext`'s own workaround here: the grid's
  // click-to-cycle header UI, arrow icon, and `aria-sort` all keep working
  // for free, they just drive this state instead of the grid's own (inert
  // in `sortingMode="server"`) internal row order.
  const [uncontrolledSortModel, setUncontrolledSortModel] =
    useState<GridSortModel>(
      () => sortModelProp ?? initialState?.sorting?.sortModel ?? [],
    )
  const sortModel = sortModelProp ?? uncontrolledSortModel
  const handleSortModelChange = useCallback(
    (
      model: GridSortModel,
      details: Parameters<
        NonNullable<DataTableProps<TRow>['onSortModelChange']>
      >[1],
    ) => {
      if (sortModelProp === undefined) {
        setUncontrolledSortModel(model)
      }
      // Same page-reset reasoning as `handleFilterModelChange` — a new sort
      // order doesn't change which top-level groups exist, but it can still
      // move the one the user was looking at off the current page.
      if (paginationModelProp === undefined) {
        setUncontrolledPaginationModel((prev) => ({ ...prev, page: 0 }))
      }
      onSortModelChangeProp?.(model, details)
    },
    [sortModelProp, paginationModelProp, onSortModelChangeProp],
  )
  // This project's Community edition never offers multi-column sort through
  // its own header UI (see `SortModel`'s own doc comment), so `sortModel`
  // is at most one item in practice — reduced here to the single-field shape
  // `sortGroupTree` actually takes, `null` once the user cycles a column
  // back to unsorted (MUI drops the item from `sortModel` entirely at that
  // point rather than keeping it with a null `sort`, but this guards the
  // shape regardless).
  const activeSortModel = useMemo<SortModel | null>(() => {
    const item = sortModel.find(
      (entry): entry is GridSortModel[number] & { sort: 'asc' | 'desc' } =>
        entry.sort === 'asc' || entry.sort === 'desc',
    )
    return item ? { field: item.field, sort: item.sort } : null
  }, [sortModel])

  // Filtered *before* grouping — see `filterRowsByModel` for why that's
  // enough to also be group-aware, unlike Premium's own tree-filtering.
  const filteredRows = useMemo(
    () => filterRowsByModel(rows, filterModel),
    [rows, filterModel],
  )

  const tree = useMemo(
    () =>
      buildGroupTree(
        filteredRows,
        groupByFields,
        aggregations,
        aggregationFunctions,
      ),
    [filteredRows, groupByFields, aggregations, aggregationFunctions],
  )

  // Fields with an active `aggregations` entry — used both by `sortGroupTree`
  // below (to know which fields it can sort group nodes by an aggregate
  // rather than only by `groupBy` value or leaf row data) and, further down,
  // by `toGroupAwareColumn`/`groupedColumns` (to know which columns render an
  // aggregate at all). Declared this early so `sortedTree` can depend on it.
  const aggregatedFields = useMemo(
    () => new Set(aggregations.map((aggregation) => aggregation.field)),
    [aggregations],
  )

  const sortedTree = useMemo(
    () => sortGroupTree(tree, activeSortModel, aggregatedFields),
    [tree, activeSortModel, aggregatedFields],
  )

  const allGroupPaths = useMemo(() => collectGroupPaths(tree), [tree])

  // Every group present when the component first mounts starts collapsed,
  // at every nesting level. A group that appears later (e.g. `rows`
  // refetched with a new value, or a filter narrowed then widened again) is
  // not in this initial set and so renders expanded — out of scope for this
  // component, which only requires collapsed-by-default on first render.
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(
    () => new Set(allGroupPaths),
  )

  const toggleGroup = useCallback((key: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => setCollapsedPaths(new Set()), [])
  const collapseAll = useCallback(
    () => setCollapsedPaths(new Set(allGroupPaths)),
    [allGroupPaths],
  )

  const flattenedRows = useMemo(
    () => flattenGroupTree(sortedTree, collapsedPaths, aggregationPosition),
    [sortedTree, collapsedPaths, aggregationPosition],
  )

  // The toolbar's download menu (`GroupedDataTableToolbar`) exports every
  // filtered record, flat — `filteredRows` (sorted the same way the grid
  // is), never `flattenedRows`/`pageRows`. Confirmed against MUI X
  // Premium's own CSV export source: its default `getRowsToExport` reads
  // the full filtered+sorted row list regardless of which groups are
  // currently collapsed, not the collapse-aware "visible rows" selector —
  // see `buildExportMatrix`'s own doc comment (GroupedDataTable.export.ts)
  // for the exact selectors and why `flattenedRows` (collapse-aware, and
  // every group starts collapsed by default) was the wrong source. Ignores
  // pagination, same as Premium's own default and matching what
  // `GroupedDataTableFooter`'s own totals already summarize.
  const exportRows = useMemo(
    () =>
      activeSortModel
        ? sortLeafRows(filteredRows, activeSortModel)
        : filteredRows,
    [filteredRows, activeSortModel],
  )

  // Built fresh on each call rather than memoized: these only run from a
  // menu click, not on every render, so there's nothing to save by caching a
  // matrix between clicks that may never happen.
  const handleExportCsv = useCallback(() => {
    exportMatrixToCsv(
      buildExportMatrix(exportRows, columns),
      `${exportFileName}.csv`,
    )
  }, [exportRows, columns, exportFileName])

  const handleExportExcel = useCallback(() => {
    void exportMatrixToExcel(
      buildExportMatrix(exportRows, columns),
      `${exportFileName}.xlsx`,
    )
  }, [exportRows, columns, exportFileName])

  // Top-level (depth-0) group count — what `paginationModel.pageSize`
  // actually paginates over, regardless of how many descendant rows any of
  // those groups currently have expanded. See `computeTopLevelPaginationRange`.
  const topLevelRowCount = tree.length

  const paginationRange = useMemo(
    () =>
      computeTopLevelPaginationRange(
        flattenedRows,
        topLevelRowCount,
        paginationModel.page,
        paginationModel.pageSize,
      ),
    [flattenedRows, topLevelRowCount, paginationModel],
  )

  const pageRows = useMemo(
    () =>
      paginationRange
        ? flattenedRows.slice(
            paginationRange.firstRowIndex,
            paginationRange.lastRowIndex + 1,
          )
        : [],
    [flattenedRows, paginationRange],
  )

  // Over `filteredRows`, not `rows` — matches MUI X Premium's own default
  // `aggregationRowsScope: 'filtered'` (aggregate what's currently visible,
  // not the whole unfiltered dataset).
  const grandTotals = useMemo(
    () => computeAggregates(filteredRows, aggregations, aggregationFunctions),
    [filteredRows, aggregations, aggregationFunctions],
  )

  const columnByField = useMemo(
    () => new Map(columns.map((column) => [column.field, column])),
    [columns],
  )

  // Built fresh on each call rather than memoized, same as
  // `handleExportCsv`/`handleExportExcel` above — only runs from a menu
  // click. `tableTitle` falls back to `exportFileName` (see its own doc
  // comment on `GroupedDataTableProps`) so existing call sites keep their
  // current heading. `grandTotals`/`columnByField` are the same ones
  // `GroupedDataTableFooter` already renders on screen — the PDF's bottom
  // summary row (`buildPdfSummaryRow`) mirrors that, not `exportRows`' own
  // (collapse-independent, but still just the flat records) totals.
  const handlePrint = useCallback(() => {
    exportMatrixToPdf(
      buildExportMatrix(exportRows, columns),
      `${exportFileName}.pdf`,
      tableTitle ?? exportFileName,
      // No `aggregations` configured means nothing to summarize — an
      // all-blank foot row would just add empty vertical space to the PDF.
      aggregations.length > 0
        ? buildPdfSummaryRow(columns, aggregations, grandTotals)
        : undefined,
    )
  }, [
    exportRows,
    columns,
    exportFileName,
    tableTitle,
    aggregations,
    grandTotals,
  ])

  // For `GroupedDataTableFilterPanel`'s column select — excludes an
  // `actions` column (nothing meaningful to filter by) and anything the
  // consumer explicitly opted out of with `filterable: false`, same as a
  // plain grid would.
  const filterableColumns = useMemo(
    () =>
      columns
        .filter(
          (column) => column.type !== 'actions' && column.filterable !== false,
        )
        .map((column) => ({
          field: column.field,
          headerName: column.headerName ?? column.field,
          kind: filterColumnKind(column),
        })),
    [columns],
  )

  // Which fields have at least one *active* filter item right now — drives
  // the header funnel icon (`toFilterAwareColumn`) only; `filterRowsByModel`
  // above is the actual filtering and doesn't consult this at all. Only
  // fields a column could actually be filtered on (same criteria
  // `filterableColumns` already applies — not an `actions` column, not
  // `filterable: false`) are included, so a crafted `filterModel` prop
  // referencing an unfilterable field can't mark one with the icon.
  const activeFilterFields = useMemo(() => {
    const filterableFieldSet = new Set(
      filterableColumns.map((column) => column.field),
    )
    return new Set(
      activeFilterItems(filterModel)
        .map((item) => item.field)
        .filter((field) => filterableFieldSet.has(field)),
    )
  }, [filterModel, filterableColumns])

  // The field to its *active* `fn`, for `toAggregationAwareColumn`'s header
  // sub-label/menu selection — `undefined` (not just absent) for a field
  // with no entry, so the header component can tell "unaggregated" apart
  // from a theoretical falsy function name.
  const aggregationFnByField = useMemo(
    () =>
      new Map(
        aggregations.map((aggregation) => [aggregation.field, aggregation.fn]),
      ),
    [aggregations],
  )

  const groupedColumns = useMemo(
    () =>
      columns.map((column) => {
        // Mirrors MUI X Premium's own default aggregable-column resolution
        // closely enough for this component's needs: a numeric column can
        // be aggregated, a `groupBy` field (already carrying the
        // expand/collapse chevron) can't — regardless of its own `type`.
        const isAggregationEligible =
          column.type === 'number' && !groupByFields.includes(column.field)

        return toAggregationAwareColumn(
          toFilterAwareColumn(
            toGroupAwareColumn(
              column,
              groupByFields,
              aggregatedFields,
              collapsedPaths,
              toggleGroup,
            ),
            activeFilterFields.has(column.field),
          ),
          isAggregationEligible,
          aggregationFnByField.get(column.field),
          availableAggregationFunctionNames,
          handleColumnAggregationChange,
        )
      }),
    [
      columns,
      groupByFields,
      aggregatedFields,
      collapsedPaths,
      toggleGroup,
      activeFilterFields,
      aggregationFnByField,
      availableAggregationFunctionNames,
      handleColumnAggregationChange,
    ],
  )

  const groupAwareGetRowClassName = useMemo(
    () => toGroupAwareRowClassName(getRowClassName),
    [getRowClassName],
  )

  const groupAwareIsRowSelectable = useMemo(
    () => toGroupAwareIsRowSelectable(isRowSelectable),
    [isRowSelectable],
  )

  // See the `columnHeaderHeightProp` destructure above for why this isn't
  // just always bumped — a consumer's own explicit value always wins, and
  // the default (`DataGrid`'s own 56) is left alone while nothing is
  // actually aggregated, since the single-line header still fits it fine.
  const columnHeaderHeight =
    columnHeaderHeightProp ?? (aggregations.length > 0 ? 64 : undefined)

  // See `GroupedDataTableFilterContext`'s own doc comment for why this has
  // to be Context rather than `slotProps.filterPanel`.
  const filterContextValue = useMemo(
    () => ({
      filterableColumns,
      filterModel,
      onFilterModelChange: handleFilterModelChange,
    }),
    [filterableColumns, filterModel, handleFilterModelChange],
  )

  // `initialState.filter.filterModel` already seeded `uncontrolledFilterModel`
  // above — it must not also reach the real underlying `<DataTable>`/
  // `<DataGrid>` here. Passing it straight through (as `initialState` alone)
  // seeds the grid's *own*, separate internal filter state with the same
  // item, and MUI renders its native per-column filter funnel icon off of
  // that internal state regardless of `filterMode="server"` — producing a
  // second, duplicate funnel next to this component's own
  // `toFilterAwareColumn` icon on whichever column the seeded item named
  // (e.g. "Tienda"). Same reasoning as never passing the `filterModel` *prop*
  // to the grid below — `filter` is stripped out here for the same reason.
  const gridInitialState = useMemo(() => {
    if (!initialState?.filter) {
      return initialState
    }
    const { filter: _filter, ...rest } = initialState
    return rest
  }, [initialState])

  return (
    <GroupedDataTableFilterContext.Provider value={filterContextValue}>
      <DataTable<GroupedRow<TRow>>
        {...(props as DataTableProps<GroupedRow<TRow>>)}
        initialState={gridInitialState}
        rows={pageRows}
        columns={groupedColumns}
        getRowClassName={groupAwareGetRowClassName}
        isRowSelectable={groupAwareIsRowSelectable}
        checkboxSelection={checkboxSelection}
        showToolbar={showToolbar}
        columnHeaderHeight={columnHeaderHeight}
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationModelChange}
        // No `filterModel`/`onFilterModelChange` here, deliberately — the
        // underlying Community `<DataGrid>` forces
        // `disableMultipleColumnsFiltering: true` unconditionally (confirmed
        // in its own `DATA_GRID_FORCED_PROPS`, no prop overrides it), and
        // every `setFilterModel` call — including the one its own controlled-
        // prop sync effect makes whenever the `filterModel` prop changes —
        // truncates `items` down to one and logs a console error once a
        // second item exists. `GroupedDataTableFilterPanel` reads and writes
        // `filterModel` through `GroupedDataTableFilterContext` instead (see
        // its own doc comment for why `slotProps` alone isn't enough here),
        // bypassing the grid entirely — `filterRowsByModel` already uses that
        // same state, not whatever the grid's own internal copy ends up
        // holding, so none of this affects what's actually filtered.
        // `rowCount` is the top-level group count, not `pageRows.length` or
        // `flattenedRows.length` — it's what `GridPagination`'s "X–Y of
        // rowCount" and page-count math are based on, and it must match what
        // `paginationModel.pageSize` actually paginates over (see
        // `computeTopLevelPaginationRange`).
        rowCount={topLevelRowCount}
        // `rows` is already exactly one page (`pageRows`, sliced by
        // `computeTopLevelPaginationRange` above) rather than the grid's own
        // row-count-based slicing — `paginationMode="server"` tells it to
        // trust that and not re-slice on top of it, the same mechanism MUI's
        // own docs use for externally-computed pagination. `filterMode`
        // mirrors this defensively for filtering: even though the grid is
        // never given a real `filterModel`, this guarantees it never attempts
        // to filter `pageRows` itself using whatever stray internal filter
        // state a column header's "Filter" menu item might otherwise
        // populate. `sortingMode` mirrors this for sorting, for a stronger
        // reason than mere defensiveness: `pageRows` already reflects
        // `sortedTree` (group nodes reordered by their own `groupBy` value or
        // aggregate, leaf rows by their raw field value — see
        // `sortGroupTree`), and the grid's own *client* sort mode would
        // re-sort that already-tree-aware order as one flat list, which has
        // no concept of "stay under your own group" and would scramble
        // group/child pairing. `sortModel` is naturally kept to the
        // single-item shape `sortGroupTree` (and `activeSortModel` above)
        // actually support without an explicit `disableMultipleColumnsSorting`
        // — that prop doesn't even exist on this project's Community edition
        // (it's Pro/Premium-only): multi-column sort via shift-click isn't
        // something Community's own header UI offers to begin with.
        // `sortModel`/`onSortModelChange` themselves *are* safe to pass
        // straight through here, unlike `filterModel` above — see the
        // `uncontrolledSortModel` comment for why. All of this is a hard
        // requirement, not a passed-through default: placed after the
        // `...props` spread so a consumer can't override it. Column
        // drag-reorder is untouched and keeps working.
        paginationMode="server"
        filterMode="server"
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={handleSortModelChange}
        slots={{
          toolbar: GroupedDataTableToolbar,
          filterPanel: GroupedDataTableFilterPanel,
          ...props.slots,
          footer: GroupedDataTableFooter,
        }}
        slotProps={{
          ...props.slotProps,
          // Every native icon button the grid itself renders without an
          // explicit `color` of its own — the sort arrow chief among them,
          // now that sorting is live — resolves to MUI `IconButton`'s own
          // default `color="default"`, which this project's theme
          // (src/theme/index.ts) maps to a literal `main: '#ffffff'`
          // (`palette.default`, added for `<Button color="default">`, not
          // icon buttons). That renders the icon fully white-on-white
          // against the header background: present in the DOM (confirmed:
          // the `<svg data-testid="ArrowUpwardIcon">` is there once sorted)
          // but invisible — the exact same pitfall already documented (and
          // fixed the same way, `color="inherit"`) on this component's own
          // toolbar filter trigger and aggregation-menu trigger, just not
          // reachable there since this one's rendered entirely inside the
          // underlying grid, not by this component's own JSX. Merged rather
          // than replaced (`...props.slotProps` above already covers every
          // other slot) so a consumer's own `slotProps.baseIconButton`
          // still wins field-by-field, color included.
          baseIconButton: {
            color: 'inherit',
            ...props.slotProps?.baseIconButton,
          },
          toolbar: {
            filterCount: filterModel.items.length,
            onPrint: handlePrint,
            onExportCsv: handleExportCsv,
            onExportExcel: handleExportExcel,
          },
          footer: {
            groupCount: topLevelRowCount,
            grandTotals,
            aggregations,
            columnByField,
            onExpandAll: expandAll,
            onCollapseAll: collapseAll,
          },
        }}
        className={clsx('grouped-data-table', className)}
      />
    </GroupedDataTableFilterContext.Provider>
  )
}

export default GroupedDataTable
