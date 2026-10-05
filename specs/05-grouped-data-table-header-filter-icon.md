# SPEC 05 — Grouped Data Table: Column Header Filter Icon

> **Status:** Implemented
> **Depends on:** specs/04-grouped-data-table-filtering.md
> **Date:** 2026-10-03
> **Objective:** When a column has an active filter, mark its header with a
> funnel icon — matching the reference screenshot of MUI X Premium's own
> grouped data grid ("Commodity" and "Status" marked, "Quantity"/"Filled
> Quantity"/"Unit Price", unfiltered, not).

## Why this spec exists

Spec 04 gave `GroupedDataTable` full multi-item filtering (toolbar trigger,
from-scratch panel, group-aware row matching), but nothing on the grid
itself showed *which* columns were currently being filtered — a user had to
reopen the panel to check. Asked to check MUI X Premium's own behavior and
replicate it: Premium marks a filtered column's header with a small funnel
icon, persistently (not only on hover).

The underlying Community `<DataGrid>` can't be asked to do this itself:
`GroupedDataTable` deliberately never forwards its real `filterModel` to the
grid (see spec 04's "Why this spec exists" — Community forces
`disableMultipleColumnsFiltering`, which would silently truncate a
multi-item model), so the grid's own internal filter state — which is what
its built-in header icon would key off — never reflects what's actually
filtering the rows. The icon has to be driven from `GroupedDataTable`'s own
`filterModel` state instead, the same state `filterRowsByModel` already
reads.

## Scope

**In:**

- `activeFilterItems(filterModel)` — extracted from `rowMatchesFilterModel`'s
  own inline logic (unchanged behavior, now also reused by the icon) — an
  item counts as "active" once it has a real value, or is `isEmpty`/
  `isNotEmpty` (which never read a value).
- `toFilterAwareColumn(column, hasActiveFilter)` — wraps `renderHeader` to
  append a `FilterAltOutlinedIcon` after the existing header label (chaining
  onto any `renderHeader` already present, e.g. from `toGroupAwareColumn`)
  when `hasActiveFilter` is true; returns the column untouched otherwise.
- Wired in `GroupedDataTable` via `activeFilterFields` (a `Set<string>` of
  fields with at least one active item, restricted to fields a column could
  actually be filtered on — same criteria `filterableColumns` already
  applies), applied to every column after `toGroupAwareColumn`.
- `--palette-action-active` (the same muted, themed grey MUI itself uses for
  header chrome like sort arrows) for the icon color, not `--body-text` —
  reads as secondary to the label.
- Verified in a real browser (Storybook's `WithFiltering` story, Playwright
  screenshot), not only `jsdom` — spec 04's own Risks table flags that
  portal/visual issues on this component have twice escaped the `jsdom`
  suite.

**Out of scope:**

- Making the icon itself interactive (e.g. opening the filter panel scoped
  to that column on click) — the reference screenshot shows a static
  indicator; the toolbar button and each column's own header menu already
  reach the panel.
- A per-column filter count badge — Premium's own grouped-data screenshot
  shows a plain icon, no count.

## Data model

No persisted/domain data. One new pure function and one new column-wrapping
function in `src/components/groupedDataTable/GroupedDataTable.tsx`:

```ts
function activeFilterItems(filterModel: GridFilterModel): Array<GridFilterItem>
function toFilterAwareColumn<TRow>(
  column: GridColDef<GroupedRow<TRow>>,
  hasActiveFilter: boolean,
): GridColDef<GroupedRow<TRow>>
```

Columns are built as `toFilterAwareColumn(toGroupAwareColumn(...), ...)` —
the filter icon wraps on top of the existing group-aware rendering rather
than replacing it.

## Acceptance criteria

- [x] A column with at least one active filter item shows a funnel icon next
      to its header label.
- [x] A column with no active filter on it shows no icon.
- [x] An added-but-not-yet-filled filter item (no value, not `isEmpty`/
      `isNotEmpty`) does not mark its column — matches `rowMatchesFilterModel`'s
      own definition of "active" exactly (shared helper, not a second
      definition that could drift).
- [x] Removing a field's only filter item (including via "Eliminar todos")
      removes the icon from that column.
- [x] Filtering on the `groupBy` field itself marks that column's header the
      same way any other field does.
- [x] Verified visually in a real browser (Playwright screenshot of the
      `WithFiltering` story), not just `jsdom`.
- [x] Every spec 01–04 acceptance criterion still holds.

## Decisions

- **Yes:** derive "active" from the same `activeFilterItems` helper
  `rowMatchesFilterModel` uses, rather than a separate `filterModel.items`
  check — guarantees the icon can never show (or hide) out of sync with
  what's actually filtering rows.
- **Yes:** chain onto `column.renderHeader` rather than render a wrapper
  element around the whole header cell — `renderHeader` only replaces the
  label in MUI X; sort/menu/resize chrome stays exactly as MUI renders it.
- **No:** click-to-open-panel on the icon itself — not shown in the
  reference screenshot, and redundant with the toolbar button and each
  column's own header menu.

## Risks

| Risk | Mitigation |
| --- | --- |
| A future change to `rowMatchesFilterModel`'s "active" definition forgets the icon depends on the same helper | Both now call the single exported-from-module `activeFilterItems` function — there is no second copy of this logic to drift |
| `renderHeader` wrapping breaks a consumer's own custom `renderHeader` | Original `renderHeader` (if any) is always called first and its result rendered before the icon, never replaced |

## What is **not** in this spec

- Clicking the header icon to open a column-scoped filter panel.
- A per-column active-filter count badge.

Each one of those, if it lands, goes in its own spec.
