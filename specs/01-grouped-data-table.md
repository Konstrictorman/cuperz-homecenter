# SPEC 01 — Grouped Data Table Component

> **Status:** Implemented
> **Depends on:** None
> **Date:** 2026-09-25
> **Objective:** Add a reusable `GroupedDataTable` component, built on top of the existing Community-tier `DataTable`, that groups rows by a developer-configured column and shows a per-column aggregation (sum/count/avg/min/max) on collapsible group rows plus a grand-total footer.

## Why this spec exists

The feature request started from a screenshot of MUI X **Data Grid Premium**'s built-in row grouping + aggregation. This project's `DataTable` (`src/components/dataTable/DataTable.tsx`) wraps `@mui/x-data-grid` **Community** (`package.json`), which has no native row grouping or aggregation — confirmed by the comment already in `PurchaseOrderStoresTable.tsx` explaining why that table was hand-built with a plain MUI `Table` + `Collapse` instead of the grid's own APIs. This spec is that same hand-built approach, generalized into a reusable component instead of a one-off, so it does not depend on adopting a Premium/Pro license.

## Scope

**In:**

- New component at `src/components/groupedDataTable/`: `GroupedDataTable.tsx`, `GroupedDataTable.css`, `GroupedDataTable.stories.tsx`, `GroupedDataTable.test.tsx` — same file layout as `src/components/dataTable/`.
- Wraps the existing `DataTable` (MUI X DataGrid Community). No new grid dependency, no MUI X Pro/Premium license.
- Single-level grouping: rows are grouped by one developer-configured column via a required `groupBy` prop (the field name to group by).
- Group rows are synthetic rows inserted into the array passed to the underlying grid — they do not represent real data records.
- The grouped column's cell on a group row shows: expand/collapse chevron + group value + `(count)`, where count is always the number of child rows in that group (built-in, not configurable).
- Per-column aggregation is developer-configured via an optional `aggregations` prop (`{ field, fn }[]`, `fn` one of `sum | count | avg | min | max`). A column listed there shows its computed value on every group row; a column not listed is blank on group rows. There is no runtime UI to change grouping column or aggregation function.
- Groups start collapsed. Each group's chevron toggles independently. No expand-all/collapse-all control.
- Footer shows: total number of groups, and for each column in `aggregations`, a grand total computed over the full dataset (all child rows, not just the currently expanded/visible ones).
- Column sorting (clicking a header to sort) is disabled while `groupBy` is set, to avoid a native sort scrambling synthetic group rows and their children. Pagination and column reordering stay enabled and operate on the flattened array — a group's children can be split across a page boundary.
- No checkbox on group rows, even when `checkboxSelection` is on (the `DataTable` default). Child rows keep normal checkbox behavior.
- Delivered as infrastructure: Storybook stories + unit tests with sample data. No existing screen is migrated to it in this spec.
- Must be able to represent the store→product grouped data found in `docs/Copy of pedidoxtiendas.xlsx` (rows 39 onward): grouped by store (`Nombre Tienda`), product rows as children (`Ean Producto`, `Factory`, `Descripcion Producto`, `Cantidad Orden`, `Valor Unitario`, `Valor Total Orden`, `Cantidad Despacho`, `Valor Total Despacho`), `sum` aggregation on `Valor Total Orden`. This is real Homecenter-derived data used to validate the component's shape, not a new consumer screen — see the acceptance criterion below.

**Out of scope (for future specs):**

- Multi-level/nested grouping (e.g. the domain's Orden → Tienda → Contenedor → Producto hierarchy).
- Runtime UI controls to change the grouping column or a column's aggregation function (the Premium-style column-header dropdown).
- An expand-all/collapse-all control.
- Migrating `PurchaseOrderStoresTable`, or wiring any other screen, to use `GroupedDataTable`.
- Evaluating or adopting `@mui/x-data-grid-pro`/`-premium`.
- A group-aware sort comparator that would allow sorting while keeping grouping intact.
- Server-side grouping/aggregation (pagination and totals computed on the backend).

## Data model

This feature introduces no persisted/domain data — it's a UI component. The concrete structure it introduces is the component's prop and internal row types:

```ts
// src/components/groupedDataTable/GroupedDataTable.tsx

export type AggregationFn = 'sum' | 'count' | 'avg' | 'min' | 'max'

export interface ColumnAggregation<TRow> {
  field: keyof TRow & string
  fn: AggregationFn
}

export type GroupedDataTableProps<TRow extends GridValidRowModel> =
  DataTableProps<TRow> & {
    groupBy: keyof TRow & string
    aggregations?: ColumnAggregation<TRow>[]
  }
```

Internal synthetic group row, inserted into the array passed to the underlying `DataTable`:

```ts
interface GroupRow {
  id: string // `__group__${groupValue}` — prefixed to avoid colliding with real row ids
  __isGroupRow: true
  groupValue: string
  count: number
  aggregates: Record<string, number> // field -> computed value, only for fields in `aggregations`
}
```

## Implementation plan

1. Scaffold `src/components/groupedDataTable/GroupedDataTable.tsx`: typed `groupBy`/`aggregations` props, rendering `DataTable` pass-through with no grouping logic yet. Add an empty `GroupedDataTable.css` importable from the component. System still builds and runs.
2. Implement a pure, exported row-flattening function that takes `rows`, `groupBy`, `aggregations` and returns the flattened `(GroupRow | TRow)[]` array, computing each group's count and configured aggregates, and the dataset's grand totals. No collapse state yet — every group renders expanded.
3. Add collapse state (`useState` set of collapsed group values, initialized to _all_ groups) so the flattening function omits a group's children while its value is in that set. Wire the chevron `IconButton` in the grouped column's `renderCell` to toggle membership.
4. Style group rows distinctly via `getRowClassName` and `GroupedDataTable.css`, reusing `DataTable.css`'s tokens. Suppress the selection checkbox on group rows via the grid's row-selectability option.
5. Disable column sorting on the underlying grid whenever `groupBy` is set; verify pagination and column drag-reorder still work.
6. Add the footer: group count + grand total per aggregated column, styled consistently with `DataTable`'s themed footer.
7. Write `GroupedDataTable.stories.tsx` (`Default` — grouped with one `sum` aggregation; `WithMultipleAggregations`; `Empty`), following `DataTable.stories.tsx`'s pattern and `docs.description`.
8. Write `GroupedDataTable.test.tsx` covering the acceptance criteria below, following `DataTable.test.tsx`'s Testing Library conventions. Include a fixture derived from `docs/Copy of pedidoxtiendas.xlsx` (rows 39 onward, store→product data) as one of the test datasets, to cover a real multi-group, variable-children-per-group shape rather than only small hand-written samples.

## Acceptance criteria

- [ ] `GroupedDataTable` renders exactly one group row per distinct `groupBy` value, and every group starts collapsed (no child rows visible on first render).
- [ ] A group row's grouped-column cell shows the group value followed by `(N)`, where `N` is that group's child-row count.
- [ ] Clicking a group row's chevron reveals its child rows; clicking again hides them; other groups are unaffected.
- [ ] For each column listed in `aggregations`, every group row shows that column's computed value (`sum`/`avg`/`min`/`max`); columns not listed are blank on group rows.
- [ ] The footer shows the total number of groups and, for each aggregated column, a grand total computed over all child rows regardless of expand/collapse state.
- [ ] No checkbox renders on group rows; child rows keep the checkbox when `checkboxSelection` is enabled.
- [ ] Column headers are not clickable to sort while `groupBy` is set.
- [ ] `npm test` passes for `GroupedDataTable.test.tsx` with no console errors or warnings.
- [ ] `npm run storybook` renders all `GroupedDataTable` stories without errors.
- [ ] Fed the store→product rows derived from `docs/Copy of pedidoxtiendas.xlsx` (rows 39 onward, 32 stores, 1–12 products each), grouped by `Nombre Tienda` with `sum` aggregation on `Valor Total Orden`, `GroupedDataTable` reproduces the file's own precomputed per-store totals exactly — e.g. `SOD SUBA` (rows 43–46) → `518.600,00` and `SOD CEDRITOS` (rows 52–54) → `652.400,00`.

## Decisions

- **Yes:** build grouping/aggregation by hand on top of the Community `DataTable`, following the `PurchaseOrderStoresTable` precedent. The screenshot that prompted this spec is from MUI X Premium's demo, which this project doesn't have.
- **No:** adopt `@mui/x-data-grid-pro`/`-premium`. A licensing decision is out of scope for a component spec; revisit if the team buys a license.
- **Yes:** single-level grouping only. Covers the confirmed need with far less complexity than a nested Orden→Tienda→Contenedor→Producto tree; that hierarchy can be its own spec.
- **Yes:** grouping column and per-column aggregation function are developer-configured props, not runtime UI controls. Simpler first version; avoids designing a Premium-style column-header aggregation picker with no confirmed use case.
- **Yes:** disable column sorting while `groupBy` is active. Sorting the flattened array (synthetic group rows mixed with children) would scramble group/child pairing; a group-aware sort comparator is real extra work with no confirmed need yet.
- **Yes:** keep the grid's native pagination while grouped, accepting a group can be split across pages. Simpler than re-deriving pagination over groups instead of flattened rows.
- **Yes:** groups start collapsed, matching the existing `PurchaseOrderStoresTable` precedent in this codebase.
- **Yes:** delivered as infrastructure only (Storybook + tests), no screen migrated in this spec. Keeps this spec small and independently testable; a follow-up spec can migrate `PurchaseOrderStoresTable` or wire a new screen.
- **No:** expand-all/collapse-all control. Not requested; add later if needed.

## Risks

| Risk                                                                                                                                                                                    | Mitigation                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A future prop override re-enables native column sort, breaking group/child row pairing                                                                                                  | Document `disableColumnSort` as a hard requirement while `groupBy` is set, not just a passed-through default, in the component's own code comment and Storybook description |
| The grand-total footer aggregates the _entire_ dataset while pagination only shows one page's flattened rows — can look inconsistent to a user comparing the footer to what's on screen | Documented behavior; matches how Premium's own total row works (whole dataset, not just the current page)                                                                   |
| Synthetic group row id (`__group__<value>`) collides with a real row's `id` if a consumer's data contains that literal string                                                           | Documented in the component's props JSDoc as a reserved id prefix                                                                                                           |

## What is **not** in this spec

- Multi-level/nested grouping (Orden → Tienda → Contenedor → Producto).
- Runtime UI to change grouping column or per-column aggregation function.
- Expand-all/collapse-all control.
- Migrating `PurchaseOrderStoresTable` or any other screen to `GroupedDataTable`.
- MUI X Pro/Premium license evaluation or adoption.
- Group-aware sorting.
- Server-side grouping/aggregation.

Each one of those, if it lands, goes in its own spec.
