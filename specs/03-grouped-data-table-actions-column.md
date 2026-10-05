# SPEC 03 — Grouped Data Table: Row-Kind-Aware Custom Columns (Actions Column)

> **Status:** Implemented
> **Depends on:** specs/01-grouped-data-table.md, specs/02-grouped-data-table-advanced-grouping.md
> **Date:** 2026-10-02
> **Objective:** Let a column that isn't a `groupBy` field or an aggregated
> column (an MUI X `type: 'actions'` column, in particular) render
> differently per row kind — e.g. an action shown only on group rows — the
> same way MUI X Premium lets a column's own `getActions`/`renderCell`
> branch on `params.rowNode.type`.

## Why this spec exists

Asked whether an `actions` column with an icon button restricted to group
rows is possible in `GroupedDataTable`, and whether MUI X Premium supports
the same scenario. Checking Premium's source confirmed it does, and _not_
via anything special in its row-grouping machinery — a column's own
`getActions`/`renderCell` always runs for every row kind, including a
synthetic group row; a consumer wanting group-row-only behavior just checks
`params.rowNode.type === 'group'` themselves inside that callback. Nothing
in Premium's grouping feature restricts or rewrites a column's own
rendering.

Checking `GroupedDataTable`'s own `toGroupAwareColumn` (specs 01/02) found
it did the opposite: it unconditionally replaced **every** column's
`renderCell`, including columns that are neither a `groupBy` field nor
aggregated. For such a column, the group-row branch always returned `''`
(blank) with no way to opt out, and even the _leaf-row_ branch only called
`original.renderCell` if the column happened to already have one set
directly — which an MUI column `type` (`'actions'`, `'boolean'`,
`'singleSelect'`, …) does not; those types' built-in rendering is merged in
by the grid's own internal column-type hydration, which never runs because
`toGroupAwareColumn`'s own `renderCell` always wins once set. In other
words: an `actions` column (or any other `type`-driven custom rendering) was
silently broken on **every** row, group or leaf — not just a missing
feature on group rows specifically.

## Scope

**In:**

- `toGroupAwareColumn` no longer wraps a column's `renderCell` at all when
  that column is neither a `groupBy` field nor in `aggregations` — such a
  column (an `actions` column, `type: 'boolean'`, a custom `renderCell`,
  etc.) is returned completely untouched, so the grid's own rendering
  (including MUI's `type`-based defaults) runs unmodified for every row
  kind: leaf, group, and group-footer.
- The exported `isGroupRow`/`isGroupFooterRow` type guards (already public
  since spec 01/02) are the mechanism a consumer uses inside their own
  `getActions`/`renderCell` to branch on row kind — mirroring
  `params.rowNode.type` in Premium. No new prop or API surface was added;
  this is a correctness fix to an existing contract (any consumer-provided
  column renders as configured) that happens to unlock the requested
  scenario.
- New Storybook story (`WithActionsColumn`) and test coverage demonstrating
  a `type: 'actions'` column whose `getActions` returns a _different_ action
  depending on row kind: a "Maximus" action on group rows, and — mirroring
  the real `onViewDetail` "Ver detalle" action on
  `PurchaseOrdersTable`/`-usePurchaseOrdersColumns.tsx` (`VisibilityIcon` +
  `GridActionsCellItem`) rather than inventing a demo-only shape — a "Ver
  detalle" action on leaf rows. Each action's handler alerts the specific
  row it ran for, by that row's own name (`group.groupValue` /
  `row.producto`) — not a fixed string, so the fix is demonstrably wired to
  the actual clicked row, not just "an action renders at all".

**Out of scope:**

- A dedicated `GroupedDataTable` prop for "group-row actions" — the
  consumer's own `getActions` already covers it with no new API needed.
- Actions on group-footer rows specifically (the new story only covers
  group and leaf rows, per what was asked) — the same `isGroupFooterRow`
  guard covers that case too if a consumer wants it; no special-casing
  added.

## Acceptance criteria

- [x] A `type: 'actions'` column's `getActions` is invoked for every row
      kind (leaf, group, group-footer) with that row kind's own `params.row`,
      exactly as it would be on a plain `DataTable`.
- [x] `getActions` branching on `isGroupRow(params.row)` can render a
      completely different action per row kind (not just show/hide the same
      one) — a group-row action and a leaf-row action, each wired to that row's
      own `onClick`.
- [x] An action's `onClick` closes over the specific row it was rendered
      for — clicking one leaf row's action reports that row's own name, not a
      sibling's or the last-rendered row's.
- [x] Every spec 01/02 acceptance criterion still holds — the `groupBy`
      field(s) and `aggregations` columns are unaffected by this change (they
      still go through the existing chevron/aggregate/blank rendering).
- [x] `npm test` passes for `GroupedDataTable.test.tsx` with no console
      errors or warnings.
- [x] `npm run build-storybook` renders the new story without errors.

## Decisions

- **Yes:** fix this as a correctness bug in `toGroupAwareColumn`'s existing
  contract, not as a new opt-in prop — a column the consumer didn't ask
  `GroupedDataTable` to customize (not `groupBy`, not `aggregations`)
  should never have had its rendering touched in the first place.
- **No:** a `GroupedDataTable`-specific actions API (e.g. a `groupActions`
  prop) — MUI X's own `getActions` + the already-exported `isGroupRow` guard
  covers it with less API surface, and matches Premium's own mechanism
  exactly.

## Risks

| Risk                                                                                                      | Mitigation                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A consumer relied on the old (incorrect) behavior of non-special columns always being blank on group rows | Unlikely given it was undocumented and arguably a bug, not a feature — no existing consumer in this codebase uses `GroupedDataTable` yet (confirmed by grep in spec 01/02) |

## What is **not** in this spec

- A dedicated actions-related prop on `GroupedDataTable`.
- Group-footer-row action coverage beyond what `isGroupFooterRow` already
  allows a consumer to do unassisted.

Each one of those, if it lands, goes in its own spec.
