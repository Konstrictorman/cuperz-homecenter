# SPEC 04 — Grouped Data Table: Filtering

> **Status:** Implemented
> **Depends on:** specs/01-grouped-data-table.md, specs/02-grouped-data-table-advanced-grouping.md, specs/03-grouped-data-table-actions-column.md
> **Date:** 2026-10-02
> **Objective:** Give `GroupedDataTable` the same column-filtering
> capability shown in MUI X Premium's own row-grouping demo — a discoverable
> trigger, `Column`/`Operator`/`Value` rows, "+ ADD FILTER"/"REMOVE ALL" —
> correctly for grouped data, without taking on
> `@mui/x-data-grid-pro`/`-premium`.

## Why this spec exists

Asked to check how MUI X Premium's grouped data grid handles filtering and
replicate it. The filter panel UI itself turned out to be a Community-tier
feature already reachable, unmodified, from every column's header menu
("Filter" item) — confirmed via `toGroupAwareColumn`'s existing contract
(spec 03): a column that isn't a `groupBy` field or aggregated is passed
through untouched, filter machinery included. What Premium actually does
differently is **grouping-aware row matching**: `rowCount`, page math, and
which rows even reach the grid all have to account for the tree, not just
run the plain per-row filter MUI ships.

Checking Premium's own mechanism (`filterRowTreeFromGroupingColumns`,
`shouldApplyFilterItemOnGroup` in `gridRowGroupingUtils.js`) found: a leaf is
visible if it passes the filter; a group is visible if _it_ passes (checked
only against filter items targeting its own grouping column) **or** at
least one descendant passes. That split exists because Premium's grouping
column is auto-generated — it isn't a real field on a leaf row, so filtering
on it needs a special translation layer.

`GroupedDataTable` doesn't have that problem: its leaf rows are the
consumer's real `TRow` objects, carrying the actual `groupBy` field values
directly — nothing auto-generated. That makes the port simpler than the
original: filter the leaf rows against the model _before_ building the
group tree (reusing the existing `buildGroupTree`/`flattenGroupTree`
pipeline unchanged), and a group with zero matching leaves simply never
gets a tree node — no bottom-up visibility pass, no column-vs-grouping-field
special-casing, needed.

Reusing MUI's own per-operator matching functions
(`column.filterOperators[…].getApplyFilterFn`) turned out not to be
practical outside a mounted grid: the built-in implementations call
`apiRef.current.getRowFormattedValue`/`apiRef.current.ignoreDiacritics`,
which only exist on a live grid instance — unusable when filtering has to
run on plain row data _before_ anything is ever handed to a `<DataGrid>`.
`matchesFilterItem` reimplements the same operator set MUI's default string/
number/date/boolean/single-select column types register instead (see its
own doc comment for the exact scope/limits of that reimplementation).

**Follow-up, same day:** after landing the above, there was still no visible
icon/button anywhere that opened the filter panel — only a column header's
three-dot menu, hidden until that specific header is hovered. Neither
`DataTable` nor `GroupedDataTable` render a toolbar by default (`DataGrid`
Community itself defaults `showToolbar` to `false`); the filter panel was
reachable but not discoverable. Fixed by defaulting `showToolbar` to `true`
and supplying a minimal `slots.toolbar` (`GroupedDataTableToolbar`) — just
MUI X's own non-deprecated `FilterPanelTrigger`/`Toolbar`/`ToolbarButton`
primitives (the same ones its full default `GridToolbar` composes from),
not the full default toolbar, which also bundles a column-visibility
selector (risky: hiding the `groupBy` field's column would take its chevron
with it) and quick/global-text search (a separate filtering path
`filterRowsByModel` doesn't implement — enabling it would add a visible
control that silently does nothing).

**Second follow-up, same day:** asked for the "+ ADD FILTER"/"REMOVE ALL"
buttons (and a per-item delete), still missing from the panel the toolbar
button opened. Checking why: `useDataGridProps.js`'s own
`DATA_GRID_FORCED_PROPS` forces `disableMultipleColumnsFiltering: true` on
every Community `<DataGrid>`, unconditionally, with no prop able to override
it (it's spread in _after_ all other props when the grid resolves its final
prop set). `GridFilterPanelBase.js` hides its entire "+ ADD FILTER"/
"REMOVE ALL" footer behind `!rootProps.disableMultipleColumnsFiltering` — so
that UI literally cannot render on Community, regardless of what
`GroupedDataTable` does. Worse: `gridFilterUtils.js`'s `sanitizeFilterModel`
(invoked by _every_ `setFilterModel` call, including the grid's own
controlled-prop sync effect whenever the `filterModel` prop changes) forces
`items` down to `[items[0]]` whenever `disableMultipleColumnsFiltering` is
true and more than one item is present — and logs a `console.error` the
first time it happens. This isn't a rendering restriction alone; passing a
genuinely multi-item `filterModel` as a controlled prop into the Community
grid gets silently clipped at the state level too.

Fixed by building `GroupedDataTableFilterPanel` (default `slots.filterPanel`)
from scratch — MUI's own per-row filter form (`GridFilterForm`) isn't part
of the public API (no exported type, can't be safely imported), so this is a
new, from-scratch UI: one row per `GridFilterItem` (delete button, column
select, operator select from a hand-written Spanish-labeled operator table
keyed by a column's resolved "kind", a value input where the operator needs
one), an AND/OR toggle once there's more than one row, and
"Agregar filtro"/"Eliminar todos" buttons. Critically, this panel reads and
writes `filterModel` through its own `slotProps` — wired directly to
`GroupedDataTable`'s own state — rather than through `apiRef.setFilterModel`
or the grid's `filterModel` controlled prop, so it never touches the code
path that clips multi-item models. `GroupedDataTable` in turn stopped
passing `filterModel`/`onFilterModelChange` to the underlying `<DataTable>`
at all (it still manages that state itself, exactly as before — only the
forwarding to the grid was removed): `filterRowsByModel` already reads from
that same component-level state, never the grid's own internal copy, so
nothing about the actual filtering computation changed. `filterMode="server"`
stays in place defensively, so the grid never attempts its own filtering
using whatever stray single-item state `showFilterPanel` might otherwise
leave behind. The toolbar button's badge count was also switched from
`FilterPanelTrigger`'s own `state.filterCount` (which reflects the grid's
now-intentionally-never-synced internal copy) to `filterModel.items.length`
read directly from `GroupedDataTable`'s own state, via `slotProps.toolbar`.

**Third follow-up, same day:** reported that every panel control — add,
per-item delete, "Eliminar todos", even editing the seeded value — appeared
completely non-functional. Root cause was in the `WithFiltering` story, not
the panel: its args passed `filterModel` directly (`filterModel: { items:
[…] }`) with no `onFilterModelChange`, which makes the component
_controlled_ by React's standard rules — every edit in the panel still
computed a new model and reported it via that callback, but nothing was
listening, so the UI could never reflect it; the seeded "MEDELLIN" value was
frozen for exactly that reason. Fixed by seeding through
`initialState.filter.filterModel` instead (the same pattern
`WithPagination` already used for `initialState.pagination.paginationModel`,
rather than passing `paginationModel` directly) — this only seeds the
_first_ render, after which `GroupedDataTable`'s own uncontrolled state
takes over and the panel is free to change it normally.

Fixing the story surfaced a second, real bug underneath: a `filterModel`
seeded this way (or supplied by any consumer) commonly has no `id` on its
items — `GridFilterItem.id` is optional — and `GroupedDataTableFilterPanel`
was keying its rows _and_ addressing every handler (delete, edit) by
`item.id`. An id-less item produced a missing/duplicate React key, and
(more seriously) `item.id === id` would have matched every id-less row at
once had there been more than one. Fixed by addressing rows by their
position in `filterModel.items` instead of `item.id` throughout the panel
(`key={item.id ?? index}`, every handler taking `index`) — correct
regardless of whether ids are present, and the module-level
`generateFilterItemId`/counter this replaced is gone, since "Agregar
filtro" no longer needs to invent one either.

**Fourth follow-up, same day:** asked to match the reference screenshot's
visual model precisely: the AND/OR combo box on every row from the second
one on (not one shared control below all the rows), and MUI's own icons —
`GridCloseIcon`/`GridDeleteForeverIcon` (confirmed in
`material/index.js`'s default slot map: `filterPanelDeleteIcon:
GridCloseIcon`, `filterPanelRemoveAllIcon: GridDeleteForeverIcon`) — for the
per-row delete and "Eliminar todos" respectively, replacing a plain
`DeleteIcon`/`ClearAllIcon` guess. Moved the logic selector inline per row
(editable on row 1 of the pair — i.e. the second item overall — disabled
and mirroring the same value on every row after that, since
`filterModel.logicOperator` is one value for the whole model, not
per-pair — matching Premium's own panel exactly), with a same-width spacer
on row 0 so the Column/Operator/Value columns stay aligned.

**Fifth follow-up, same day:** reported the delete ("X") icon was still
missing, and a follow-up screenshot of the _real app_ (not this project's
own Storybook) showed it too. Checking in a real browser rather than trusting
`jsdom` (`run` skill, Playwright against a local Storybook build — the
`jsdom`-based test suite had never caught either of these, see below) found
two independent, real bugs:

1. **The icon was invisible, not missing.** Its computed `color` was
   `rgb(255, 255, 255)` — white, matching the white panel background. The
   panel is a plain `<div>` (no `Paper`/elevation), rendered in the grid's
   own floating Popper outside `.grouped-data-table`'s scope, so nothing
   reset the `color` it inherits from that ancestor chain — this project's
   own `Modal.css` has the identical fix already (`.modal__title
.MuiIconButton-root { color: var(--body-text) !important; }`) for the
   same reason (another portal-rendered surface). Applied the same pattern
   to `.grouped-data-table__filter-panel`.
2. **"Agregar filtro"/delete/edit genuinely didn't update the panel**, even
   though `GroupedDataTable`'s own `filterModel` state _did_ update
   correctly underneath (confirmed by instrumenting a real render: the
   handler fired, `setUncontrolledFilterModel` ran with the right value, and
   `GroupedDataTable`'s own `filterModel` variable showed the new count on
   the very next render) — but `GroupedDataTableFilterPanel` kept rendering
   the _old_ value regardless. Root cause: MUI X's `preferencePanelPreProcessing`
   renders `slots.filterPanel` through a pipe processor gated on the
   preference panel's own open/closed state, not on every `GroupedDataTable`
   render — so the already-rendered `<FilterPanel {...slotProps.filterPanel}>`
   element keeps whatever `filterModel` it had when the panel first opened;
   passing fresh values through `slotProps` on a later render never reaches
   it. Fixed by carrying `filterModel`/`filterableColumns`/
   `onFilterModelChange` through a `GroupedDataTableFilterContext` instead —
   a context consumer re-renders when the value its provider passes changes,
   regardless of whether its own parent-given props did, which sidesteps the
   pipe-processor caching entirely. `GroupedDataTableToolbar`'s badge and
   `GroupedDataTableFooter` were _not_ affected — `slots.toolbar` renders
   directly in the grid's main render path and `slots.footer` isn't gated
   behind preference-panel state, so ordinary `slotProps` still reaches
   them fine; only the filter panel needed this.

Both bugs passed the full `jsdom`-based test suite cleanly — `jsdom` doesn't
reproduce MUI's pipe-processor caching, so a test asserting "click Agregar
filtro, see 2 rows" genuinely passed there while being completely broken in
a real browser. The regression tests added for this follow-up exercise the
same interactions, but given this gap, they're not a substitute for the
real-browser check that actually found it.

**Sixth follow-up:** reported that clearing every filter from the panel
("Eliminar todos") made the toolbar's own filter trigger disappear —
with no icon left anywhere to reopen the panel. Checked in a real browser
(Playwright against a local Storybook build, same precedent as the fifth
follow-up) rather than trusting `jsdom`: the button was never removed from
the DOM (`jsdom`'s tree looked identical before and after), but its icon
rendered fully white — invisible against the white toolbar — the instant
`filterCount` dropped back to 0. Root cause: `GroupedDataTableToolbar` set
`color={filterCount > 0 ? 'primary' : 'default'}`, and this project's theme
(`src/theme/index.ts`) adds a *literal* `palette.default` entry (`main:
'#ffffff'` in both light and dark schemes) — intended for `<Button
color="default">`'s contained background, not for an `IconButton`'s
foreground. MUI's `IconButton` resolves *any* colour prop, including the
built-in-sounding `'default'`, straight off `theme.palette[color].main`
(confirmed in `@mui/material/IconButton`'s own style variants) rather than
its usual grey `action.active` — so once the theme defines that key at all,
every `color="default"` `IconButton` in the app (not just this one) renders
white-on-white. Fixed by switching the no-active-filter state to `'inherit'`
instead — it has its own dedicated `IconButton` variant (`color: 'inherit'`)
untouched by the palette, and picks up the Toolbar's own foreground colour,
which is always visible. A regression test was added asserting the button
never again carries MUI's `MuiIconButton-colorDefault` class (the one that
pulls in the broken white colour) once filters are cleared — a `jsdom`-safe
proxy for the real visual bug, not a substitute for the real-browser check
that actually found it. The wider collision (any other `color="default"`
`IconButton` in the app) is out of scope here — `MenuBar.tsx` uses
`color="default"` on `<Button>`s, which is the component this palette entry
was actually designed for, not `IconButton`.

## Scope

**In:**

- `filterModel`/`onFilterModelChange` taken over by `GroupedDataTable`
  (controlled/uncontrolled, the same pattern as `paginationModel` —
  spec 02), defaulting to no active filters.
- `filterRowsByModel(rows, filterModel)` — pure, exported — filters `rows`
  before `buildGroupTree` ever sees them. Supports the operator values MUI's
  default column types register: `contains`/`doesNotContain`/`equals`/
  `doesNotEqual`/`startsWith`/`endsWith`/`isEmpty`/`isNotEmpty`/`isAnyOf`
  (string-ish), `=`/`!=`/`>`/`>=`/`<`/`<=` (numeric), `is`/`not`/`after`/
  `onOrAfter`/`before`/`onOrBefore` (boolean/date/single-select). An
  unrecognized operator matches everything (fails open).
- `filterMode="server"` forced (like `paginationMode="server"` in spec 02)
  so the underlying grid trusts the already-filtered, already-paginated
  `rows` it receives instead of filtering them again itself.
- `grandTotals` computed over the filtered rows, not the full dataset —
  matches MUI X Premium's own default `aggregationRowsScope: 'filtered'`.
- Changing the filter (uncontrolled pagination only) resets to the first
  page, so narrowing a result can't strand the grid on a now-out-of-range
  page showing nothing.
- New Storybook story (`WithFiltering`) and test coverage, including one
  test that drives the real column-header "Filter" menu end to end (rather
  than only passing `filterModel` as a prop) to prove the entry point MUI
  ships is genuinely unmodified.
- `showToolbar` defaults to `true` (overriding `DataGrid`'s own default of
  `false`), with a minimal default `slots.toolbar`
  (`GroupedDataTableToolbar`, just the filter trigger) — so there's always a
  visible icon for filtering, not only a hover-revealed column-header menu.
  Both the default toolbar and `showToolbar` itself stay overridable by the
  consumer.
- `GroupedDataTableFilterPanel` (default `slots.filterPanel`) — a from-
  scratch multi-item filter panel (add/remove/edit any number of filters,
  an AND/OR combo box on every row from the second one on, MUI's own
  `GridCloseIcon`/`GridDeleteForeverIcon` for per-row delete/"Eliminar
  todos"), replacing MUI X Community's own panel entirely rather than
  configuring it, since Community's own `disableMultipleColumnsFiltering`
  restriction can't be worked around by any prop (see the second follow-up
  above). `GroupedDataTable` no longer forwards `filterModel`/
  `onFilterModelChange` to the underlying grid at all. The panel reads and
  writes that state through `GroupedDataTableFilterContext`, not
  `slotProps` (see the fifth follow-up above for why plain `slotProps`
  silently doesn't work here); the toolbar's filter-count badge is
  unaffected and still uses ordinary `slotProps`.

**Out of scope:**

- Reusing MUI's own `getApplyFilterFn` operator implementations — requires a
  live `apiRef`, not available before rows reach the grid (see above).
- The quick filter (global search box / `quickFilterValues`) — the
  screenshot that prompted this spec showed the column filter panel, not
  quick filter; not requested.
- Exactly replicating every edge case of MUI's built-in operators (locale-
  aware diacritic-insensitive string comparison, day-granularity date
  comparison) — `matchesFilterItem`'s own doc comment flags this as a
  deliberate, reasonable-effort reimplementation, not a byte-for-byte port.

## Data model

No persisted/domain data. New pure functions in
`src/components/groupedDataTable/GroupedDataTable.tsx`:

```ts
function matchesFilterItem(value: unknown, item: GridFilterItem): boolean
function rowMatchesFilterModel<TRow>(
  row: TRow,
  filterModel: GridFilterModel,
): boolean
export function filterRowsByModel<TRow>(
  rows: ReadonlyArray<TRow>,
  filterModel: GridFilterModel | undefined,
): Array<TRow>
```

Called as `buildGroupTree(filterRowsByModel(rows, filterModel), …)` instead
of `buildGroupTree(rows, …)` — the only change to the existing pipeline's
shape; `flattenGroupTree`, `computeTopLevelPaginationRange`, and every other
piece from specs 01–03 are unmodified.

## Acceptance criteria

- [x] Opening a column's header menu and choosing "Filter" opens the same
      `GroupedDataTableFilterPanel` the toolbar's own filter button does.
- [x] The panel supports any number of filter items: add one, edit its
      column/operator/value, delete it individually, or clear all of them —
      none of that is limited to one active filter the way MUI X Community's
      own panel is.
- [x] Filtering on a `groupBy` field works the same way as filtering on any
      other field (no special-casing needed — see "Why this spec exists").
      Filtering on a non-`groupBy` field correctly drops a group entirely once
      none of its rows match, rather than showing it with a 0 count.
- [x] The grand-total footer reflects only the filtered rows.
- [x] Narrowing the filter result resets the page to the first one (when
      pagination is uncontrolled).
- [x] Every spec 01/02/03 acceptance criterion still holds with no active
      filter (`filterModel` defaults to `{ items: [] }`, identical to today).
- [x] A filter button is visible without hovering anything, by default, and
      clicking it opens the same panel the column header's own menu does.
      `showToolbar={false}` (or a consumer's own `slots.toolbar`) removes/
      replaces it.
- [x] An AND/OR combo box appears on every row from the second one on
      (editable on the second row, disabled/mirroring on any after that), a
      close ("X") icon removes that one row, and "Eliminar todos" uses the
      delete-forever icon — matching MUI X Premium's own panel (and the
      screenshots this follow-up sequence was checked against).
- [x] Every one of the panel's own controls — add, per-row delete, edit a
      value/column/operator, "Eliminar todos" — visibly changes the grid in a
      real browser, not only in the `jsdom` test suite (see the fifth
      follow-up's note on why that distinction mattered here).
- [x] `npm test` passes for `GroupedDataTable.test.tsx` with no console
      errors or warnings.
- [x] `npm run build-storybook` renders the new story without errors.

## Decisions

- **Yes:** filter leaves before building the tree, rather than porting
  Premium's bottom-up tree-filtering algorithm — simpler and sufficient
  because, unlike Premium's grouping column, this component's leaf rows
  already carry real `groupBy` field values.
- **Yes:** reimplement the default operator set ourselves rather than call
  into MUI's own `getApplyFilterFn` — those require a live `apiRef`.
- **Yes:** reset to the first page on filter change, uncontrolled pagination
  only — a consumer driving `paginationModel` themselves owns that call.
- **No:** quick filter / global search support — not what was shown or
  asked for; its own spec if it lands.
- **Yes:** build a from-scratch filter panel rather than configure MUI's own
  — `disableMultipleColumnsFiltering` is forced unconditionally on Community
  `<DataGrid>` (not overridable by any prop), and MUI's per-row filter form
  (`GridFilterForm`) isn't part of the public API, so there's no supported
  way to reuse MUI's own row-rendering while escaping that restriction.
- **Yes:** have the panel read/write `filterModel` by bypassing
  `apiRef.setFilterModel`/the grid's `filterModel` prop entirely — the only
  way to keep a multi-item model from being silently clipped to one item by
  the grid's own state management.
- **Yes:** carry that state to the panel through `GroupedDataTableFilterContext`
  rather than `slotProps.filterPanel` — `slotProps` looks like the obvious
  choice (and is exactly what the toolbar's badge and the footer still use
  successfully) but silently doesn't work for `slots.filterPanel`
  specifically, because MUI renders it through a pipe processor gated on
  preference-panel open/closed state rather than on every parent render
  (see the fifth follow-up above). Only discovered by checking a real
  browser, not the `jsdom` test suite — recorded here so a future "just use
  slotProps, it's simpler" instinct doesn't silently reintroduce this.

## Risks

| Risk                                                                                                                                                                                      | Mitigation                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matchesFilterItem`'s reimplemented operators diverge from MUI's exact built-in behavior on an edge case (diacritics, date time-of-day)                                                   | Flagged explicitly in the function's own doc comment and here, not silently claimed as identical                                                                                                                                                                                                                      |
| A consumer relies on `filterMode`/`paginationMode` being `'client'` (e.g. passing a custom `filterOperators` whose `getApplyFilterFn` genuinely needs `apiRef`)                           | Out of scope — `filterMode="server"` is a hard requirement here, same precedent as `paginationMode="server"` in spec 02                                                                                                                                                                                               |
| A consumer relies on the underlying `<DataGrid>` receiving a real `filterModel` prop (e.g. reading `apiRef.current.state.filter.filterModel` themselves)                                  | Not supported — `GroupedDataTable`'s own `filterModel`/`onFilterModelChange` (controlled/uncontrolled prop pair) is the source of truth; the grid's own internal copy is intentionally never synced to it                                                                                                             |
| `GroupedDataTableFilterPanel`'s hand-written operator labels/value inputs drift from MUI's own (e.g. a future MUI version adds an operator `matchesFilterItem` doesn't handle)            | Unrecognized operators fail open (match everything) rather than silently excluding rows; `FILTER_OPERATORS_BY_KIND` only offers operators `matchesFilterItem` already implements, so a value picked from this panel's own dropdown always matches a case that function handles                                        |
| A future change reintroduces `slotProps.filterPanel` as the data path for the filter panel (the "obvious" choice), silently breaking add/edit/delete again — `jsdom` tests won't catch it | Documented explicitly in `GroupedDataTableFilterContext`'s own doc comment and in the Decisions above; any change to how the panel receives data should be checked in a real browser, not just `npm test`                                                                                                             |
| A visually-invisible (not functionally broken) regression — e.g. an icon color reset missing on some other portal-rendered element this component adds later                              | `jsdom`/RTL can't catch pure CSS/visual bugs like the white-on-white icon either; worth a real-browser look whenever a new icon or control is added to something rendered outside `.grouped-data-table`'s own DOM subtree (the footer, toolbar, and column cells are all fine — they're normal children, not Poppers) |

## What is **not** in this spec

- Quick filter (global search box) support.
- A byte-for-byte port of MUI's built-in filter operator implementations.

Each one of those, if it lands, goes in its own spec.
