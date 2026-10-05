# SPEC 02 — Grouped Data Table: Advanced Grouping

> **Status:** Implemented
> **Depends on:** specs/01-grouped-data-table.md
> **Date:** 2026-10-02
> **Objective:** Extend `GroupedDataTable` with the four capabilities spec 01
> explicitly deferred — multi-level grouping, an expand-all/collapse-all
> control, a configurable inline-vs-footer aggregation position, and
> pluggable aggregation functions — without taking on `@mui/x-data-grid-pro`
> or `-premium` as a dependency.

## Why this spec exists

`@mui/x-data-grid-premium` was installed temporarily (not kept — see
CLAUDE.md's "Project state") to study the real behavior of MUI X Premium's
`rowGroupingModel` and `aggregationModel`. Spec 01 had already built a
from-scratch Community-tier replica of Premium's single-level grouping +
footer-total behavior, deliberately scoping out multi-level grouping,
expand/collapse-all, and per-group (vs. dataset-only) totals as "out of
scope, for a future spec" — this is that spec. Per spec 01's own decision,
adopting `@mui/x-data-grid-pro`/`-premium` stays out of scope; everything
here is hand-built the same way, generalizing the existing tree-flattening
approach instead of switching libraries.

## Scope

**In:**

- `groupBy` accepts either one field (unchanged behavior) or an array of
  fields, outer to inner, nesting one group level per field (e.g.
  `['tienda', 'contenedor']`). Each level's group row is indented under its
  parent. A group's `(count)` is always its recursive leaf-row count,
  regardless of depth.
- Same group value recurring under different parents (e.g. "Contenedor 1" at
  two different stores) is tracked as two independent nodes, each with its
  own collapse state — collapse/expand state is keyed by the full path from
  the root, not the value alone.
- An expand-all/collapse-all toggle (two icon buttons, `UnfoldMoreIcon`/
  `UnfoldLessIcon` from `@mui/icons-material`) in the existing footer,
  expanding or collapsing every group at every nesting level at once. Hidden
  when there are no groups (e.g. `rows` is empty).
- `aggregationPosition?: 'inline' | 'footer'` (default `'inline'`, matching
  spec 01's only prior behavior). In `'footer'` mode, a group's own row is
  left blank for aggregated columns and a dedicated subtotal row
  (`Subtotal <value>` in the grouped column, the aggregate in its column) is
  appended as that group's last row — shown regardless of that group's
  collapse state, same precedent as the dataset-wide grand-total footer
  always being visible.
- `aggregationFunctions?: Record<string, AggregationFunction>` — named
  aggregation functions, merged over the built-in
  `DEFAULT_AGGREGATION_FUNCTIONS` (`sum`/`count`/`avg`/`min`/`max`).
  `aggregations[].fn` is widened from the closed `AggregationFn` union to
  `AggregationFn | (string & {})` so a custom name can be referenced while
  the built-ins still autocomplete.
- The pure grouping core is rewritten as two phases — `buildGroupTree`
  (recursive, UI-state-free: partitions rows into a `GroupTreeNode` tree,
  computing each node's recursive count/aggregates) and `flattenGroupTree`
  (applies `collapsedPaths` and `aggregationPosition` to produce the grid's
  row array) — replacing spec 01's single-level `flattenGroupedRows`.

**Out of scope (for future specs):**

- Runtime UI to change grouping fields or a column's aggregation function
  (the Premium-style column-header dropdown) — still a developer-configured
  prop, not an end-user control.
- Per-node aggregation position (Premium's `getAggregationPosition` callback
  taking a group node) — this spec's `aggregationPosition` is one grid-wide
  setting; no confirmed need for mixing inline and footer within one grid.
- Migrating `PurchaseOrderStoresTable`, or wiring any screen, to use the
  nested-grouping form of `GroupedDataTable`.
- Evaluating or adopting `@mui/x-data-grid-pro`/`-premium`.
- Server-side grouping/aggregation.

## Data model

No persisted/domain data. The component's internal tree and row types
(`src/components/groupedDataTable/GroupedDataTable.tsx`):

```ts
export type GroupByField<TRow> = keyof TRow & string
export type AggregationPosition = 'inline' | 'footer'
export type AggregationFunction = (values: ReadonlyArray<number>) => number

export interface GroupTreeNode<TRow extends GridValidRowModel> {
  path: ReadonlyArray<string> // root-to-node chain of group values
  depth: number
  field: string
  value: string
  count: number // recursive leaf-row count
  aggregates: Record<string, number>
  children:
    | { kind: 'groups'; nodes: Array<GroupTreeNode<TRow>> }
    | { kind: 'rows'; rows: Array<TRow> }
}

export interface GroupFooterRow {
  id: string
  __isGroupFooterRow: true
  path: ReadonlyArray<string>
  depth: number
  field: string
  groupValue: string
  aggregates: Record<string, number>
}
```

`GroupRow` (spec 01) gains `path: ReadonlyArray<string>`, `depth: number`,
and `field: string`; `GroupedRow<TRow>` becomes
`TRow | GroupRow | GroupFooterRow`. Collapse state moves from
`Set<string>` keyed by group _value_ to `Set<string>` keyed by
`JSON.stringify(path)` (a node's full path) — `JSON.stringify` rather than a
delimited string so two different paths can never collide on the same key
regardless of what characters a real group value contains.

## Acceptance criteria

- [x] `groupBy={['a', 'b']}` renders one group row per distinct `a` value,
      each (once expanded) nesting one group row per distinct `b` value within
      it, each indented further than its parent.
- [x] A node's `(count)` is the number of real leaf rows under it,
      recursively, at any depth.
- [x] The same value at the same depth under two different parents (e.g.
      "C1" under both "Tienda A" and "Tienda B") expands/collapses
      independently.
- [x] Clicking "expand all" reveals every group's children at every level;
      clicking "collapse all" hides them all again. The control is absent when
      there are no groups.
- [x] With `aggregationPosition="footer"`, a group's own row shows nothing
      in its aggregated columns, and a `Subtotal <value>` row appended after it
      shows the same values spec 01's inline mode put on the group row — visible
      whether or not the group is expanded.
- [x] An `aggregationFunctions` entry is used when `aggregations[].fn`
      references its key, for both a group's own aggregate and the dataset-wide
      grand total.
- [x] All of spec 01's existing acceptance criteria still hold unmodified
      for the single-field `groupBy`, default-`aggregationPosition` case — spec
      01's own test suite passes with no changes to its assertions.
- [x] `npm test` passes for `GroupedDataTable.test.tsx` (new multi-level,
      expand/collapse-all, `aggregationPosition`, and custom-`aggregationFunctions`
      cases, plus every spec 01 case unchanged) with no console errors.
- [x] `npm run build-storybook` renders all `GroupedDataTable` stories,
      including the new `MultiLevelGrouping` and `WithFooterAggregationPosition`
      stories, without errors.

## Decisions

- **Yes:** generalize spec 01's own flattening approach (two-phase
  build-tree/flatten-tree) rather than reach for `@mui/x-data-grid-pro`'s
  tree-data APIs, consistent with spec 01's "No" on taking a Pro/Premium
  dependency.
- **Yes:** key collapse state and row ids by a node's full path
  (`JSON.stringify`), not the group value alone — required once the same
  value can recur under different parents.
- **Yes:** one grid-wide `aggregationPosition`, not a per-node callback —
  Premium's `getAggregationPosition` granularity has no confirmed use case
  here.
- **Yes:** `aggregationFunctions` merges over the built-ins rather than
  replacing them, so a consumer adding one custom function doesn't have to
  re-list `sum`/`count`/`avg`/`min`/`max`.
- **No:** a runtime column-menu UI to change grouping/aggregation — still
  out of scope, same reasoning as spec 01.
- **No:** keeping `@mui/x-data-grid-premium` as a dependency — it was
  installed only to read its source as a reference while designing this
  spec.

## Risks

| Risk                                                                                                                                                                                          | Mitigation                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A consumer passes an inline array literal to `groupBy` on every render (`groupBy={['a','b']}`), causing the tree to rebuild every render                                                      | `groupByFields` is derived from a joined-string memo key instead of the array identity, so an inline literal with the same field names doesn't force a rebuild — documented in the component's own comment |
| `aggregationPosition="footer"`'s subtotal row is always shown regardless of collapse state, which could look redundant directly under an already-visible group row with blank aggregate cells | Documented behavior, same precedent as spec 01's dataset-wide grand total always being visible regardless of any group's collapse state                                                                    |
| A custom `aggregationFunctions` key collides with a built-in name (e.g. a consumer defines their own `sum`)                                                                                   | The custom entry wins (`{ ...DEFAULT_AGGREGATION_FUNCTIONS, ...aggregationFunctions }`) — documented as override-by-merge, not an error                                                                    |

## What is **not** in this spec

- Runtime UI to change grouping fields or aggregation functions.
- Per-node (vs. grid-wide) aggregation position.
- Migrating any screen to the nested-grouping form of `GroupedDataTable`.
- `@mui/x-data-grid-pro`/`-premium` adoption.
- Server-side grouping/aggregation.

Each one of those, if it lands, goes in its own spec.
