# SPEC 01 — ListChip component

> **Status:** Approved
> **Depends on:** none
> **Date:** 2026-09-17
> **Objective:** Add a reusable `ListChip` component that wraps MUI's `Chip`, shows the length of a string array as its label, and opens an anchored `Popover` with the array's items on click.

## Scope

**In:**

- New `ListChip` component at `src/components/listChip/ListChip.tsx`, extending `@mui/material/Chip`.
- `items: string[]` prop; label renders the item count, capped as described below.
- Clicking the chip opens an MUI `Popover` (`@mui/material/Popover`) anchored to the chip itself (`anchorEl` is a ref on the chip's root DOM node), positioned just below-left of it (`anchorOrigin: { vertical: 'bottom', horizontal: 'left' }`, `transformOrigin: { vertical: 'top', horizontal: 'left' }`) — like a tooltip, but built for scrollable/interactive content, which a real `Tooltip` (`role="tooltip"`, hover/focus-triggered, no scroll handling) isn't meant to hold.
- No header, no close button, no visible backdrop: `Popover`'s own backdrop defaults to `invisible: true` (a real click-catching element with a transparent background — not custom CSS), so the rest of the screen never dims, and closing is a click outside the popover or Escape (both `Popover`'s own default behavior).
- The popover's paper is capped at `max-width: 240px` via a `.list-chip__popover` class (through `slotProps.paper.className`) in `ListChip.css`.
- The item rows use a tighter line-height/padding than a default `List`/`ListItem`/`ListItemText` (`dense`, `disableGutters`/`disablePadding`, plus a reduced `line-height` in `ListChip.css`), since the 240px width leaves little room for anything roomier.
- When `items.length === 0`: label shows "0" and the chip renders **disabled** via MUI Chip's `disabled` prop (in addition to omitting `onClick`) — fully non-clickable, with MUI's built-in disabled styling.
- When `items.length > 9`: the label renders as `"9+"` instead of the raw count, keeping the chip a fixed, compact width no matter how large the array gets.
- The popover's item list is capped at `max-height: 50vh` with `overflow-y: auto`, so it never grows past half the viewport height; a scrollbar appears once the list is taller than that, regardless of item count.
- Defaults to MUI Chip's built-in `color="info"` palette when the consumer doesn't pass a `color` — same palette `Button` already uses elsewhere in this app (e.g. `Modal.stories.tsx`'s `color="info"` button). Passing an explicit `color` still overrides it.
- All other MUI `ChipProps` (icon, size, variant, className, title, etc.) pass through untouched, except `label`, `onClick`, and `disabled`, which are owned internally and excluded from the public prop type. `color` passes through too, just with the `"info"` default above.
- Co-located `ListChip.css`, required for: the item list's `max-height: 50vh` / `overflow-y: auto` scroll rule, the `240px` paper max-width override, and the tightened item line-height/padding.
- `ListChip.test.tsx` (Jest + Testing Library) and `ListChip.stories.tsx` (Storybook), matching the pattern of `StatusBadge`/`TruncatedText`.

**Out of scope (for future specs):**

- Wiring `ListChip` into any existing screen or table column (e.g. a SKUs-per-container or stores-per-order column). This spec only delivers the standalone component.
- Non-string array items (numbers, objects) — the prop type is `string[]` only.
- Virtualization/pagination of the item list — the `50vh` + scroll cap keeps arbitrarily long lists usable without it.
- Search/filter inside the popover's list.

## Data model

This feature introduces no persisted data — only a component prop interface:

```ts
// src/components/listChip/ListChip.tsx
export interface ListChipProps extends Omit<
  ChipProps,
  'label' | 'onClick' | 'disabled'
> {
  /** Strings rendered as the popover's list; the chip's label is derived from items.length. */
  items: string[]
}
```

Label derivation (internal, not a prop):

```ts
const label = items.length > 9 ? '9+' : String(items.length)
```

`color` gets a default value of `'info'` at the destructure (`color = 'info'`), rather than being owned/excluded like `label`/`onClick`/`disabled` — an explicit `color` prop still overrides it.

`ChipProps`'s native `title?: string` (the browser tooltip attribute) is not excluded from the interface — `ListChip` has no `title` concept of its own, so it's just an ordinary passthrough prop like `icon` or `size`.

Internal state: a single `open: boolean` (via `useState`) plus a `chipRef` (`useRef<HTMLDivElement>(null)`, passed as the chip's `ref` and as `Popover`'s `anchorEl`). `open` is toggled by the chip's click handler and by `Popover`'s `onClose`.

## Implementation plan

1. Create `src/components/listChip/ListChip.tsx` with the `ListChipProps` interface above, rendering a bare `MuiChip` with `label={items.length > 9 ? '9+' : String(items.length)}` and all passthrough props. No popover wiring yet — component renders and compiles.
2. Add `disabled={items.length === 0}` on `MuiChip`, a `chipRef` passed as its `ref`, and the `open` state with `onClick={() => setOpen(true)}` passed only when `items.length > 0`; import and render `Popover` with `open`, `anchorEl={chipRef.current}`, `onClose={() => setOpen(false)}`, `anchorOrigin`/`transformOrigin` as above, and `slotProps={{ paper: { className: 'list-chip__popover' } }}` (the hook for the `240px` CSS override).
3. Render `items` inside `Popover`'s children as a plain list (MUI `List` with `dense disablePadding className="list-chip__list"`, one `ListItem disableGutters className="list-chip__item"` per string, keyed by `` `${item}-${index}` ``, each wrapping a `ListItemText className="list-chip__item-text"`); add an empty-state message for the (unreachable via click, but defensively handled) `items.length === 0` case.
4. Add `ListChip.css` with: `.list-chip__list { max-height: 50vh; overflow-y: auto; }`, `.list-chip__popover { max-width: 240px !important; }` (the `!important` is required — see Decisions), and tightened item spacing (reduced `.list-chip__item` padding plus a reduced `line-height` on `.list-chip__item-text .MuiListItemText-primary`).
5. Write `ListChip.test.tsx`: label shows the raw count for `items.length` between 0 and 9, and `"9+"` for 10 or more; clicking the chip opens the popover (anchored to the chip, no `anchorEl`-invalid warning) and shows each item; the popover closes on a click on its own backdrop and on Escape; an empty `items` array renders the chip with `disabled` set and shows "0"; the list container carries the `list-chip__list` class, each item the `list-chip__item`/`list-chip__item-text` classes, and the paper the `list-chip__popover` class (the actual `50vh`/`240px` caps aren't measurable in jsdom — see Risks).
6. Write `ListChip.stories.tsx`: a default story with a handful of items, a story with an `icon` prop set to confirm passthrough, a story with an empty (disabled) array, and a story with more than 9 items to show the `"9+"` label and the scrollable popover list.

Each step leaves `ListChip` compiling and (from step 5 on) covered by passing tests.

## Acceptance criteria

- [ ] `ListChip` renders the raw item count as its label when `items.length` is between 0 and 9.
- [ ] `ListChip` renders `"9+"` as its label when `items.length` is 10 or more.
- [ ] Clicking the chip when `items.length > 0` opens a `Popover` anchored to the chip, with one row per string in `items`, and no header (no title, no close button).
- [ ] The popover's backdrop is invisible — the rest of the screen is not dimmed/grayed while it's open.
- [ ] The popover closes when clicking outside it.
- [ ] The popover closes when Escape is pressed.
- [ ] When `items` is an empty array, the chip shows "0", is rendered with MUI's `disabled` prop, and clicking it does nothing (no popover opens).
- [ ] The popover's item list container has a `max-height: 50vh` / `overflow-y: auto` rule applied, so it is capped at half the viewport height and scrolls vertically past that.
- [ ] The popover's paper is capped at `max-width: 240px`.
- [ ] Item rows render with a tighter line-height/padding than a default `List`/`ListItem`/`ListItemText`.
- [ ] With no `color` prop passed, `ListChip` renders with MUI's `color="info"` palette (`MuiChip-colorInfo`).
- [ ] Passing an explicit `color` (or `icon`, `size`, `variant`, `className`, `title`) renders exactly as MUI's `Chip` would with those props, overriding the `"info"` default.
- [ ] `npm test` passes `ListChip.test.tsx` with no console errors.
- [ ] The component ships with a Storybook story showing at least: default usage, an `icon` prop, an empty (disabled) array, and more than 9 items.

## Decisions

- **Yes:** `items` as the prop name — matches the component name and is the most direct term for "a list of things shown in a UI" (confirmed with user).
- **Yes:** label is the bare count (`String(items.length)`), no unit word — matches the literal request and keeps parity with `StatusBadge`'s compact chip style.
- **Yes:** `ListChip` owns `onClick`, `disabled`, and `label` fully; the public prop type omits all three (`Omit<ChipProps, 'label' | 'onClick' | 'disabled'>`). A consumer cannot override this behavior.
- **Yes:** empty array (`items.length === 0`) renders the chip with MUI's `disabled` prop (plus no `onClick`) rather than an openable-but-empty popover or a merely click-less chip that still looks enabled — confirmed with user.
- **Yes:** label caps at `"9+"` once `items.length > 9` — keeps the chip a fixed, compact width regardless of how large the array gets; confirmed with user.
- **Yes:** popover content is a plain list (`List`/`ListItem`), not a comma-separated string — easier to scan.
- **Yes:** `ListChip` defaults to MUI's built-in `color="info"` palette instead of `Chip`'s own `"default"` — consistent with `color="info"` already used on `Button` elsewhere (`Modal.stories.tsx`); a consumer-supplied `color` still overrides it — confirmed with user.
- **Yes:** item rows get a tighter line-height/padding (`dense`, `disableGutters`/`disablePadding`, reduced `line-height` in CSS), given the `240px` width leaves very little horizontal room to begin with — confirmed with user.
- **No (superseded):** using the shared `Modal` component (`src/components/modal/Modal.tsx`, an MUI `Dialog` wrapper) at all. Earlier rounds of this spec built `ListChip`'s overlay on `Modal` — no `title` prop, no header/close button (hidden via CSS), a `240px`-max-width `Dialog` paper (via `!important`, since `Dialog`'s own Paper styles fight a plain override). That whole approach is now replaced by `Popover` (see below); it's kept here only as history, since every one of those `Modal`-specific decisions became moot once the overlay stopped being a `Dialog`.
- **Yes:** the overlay is an MUI `Popover`, not `Modal`/`Dialog` or `Tooltip` — confirmed with user, who explicitly asked to compare the three. `Tooltip` was ruled out because it's non-interactive (`role="tooltip"`, hover/focus-triggered) and has no scroll handling — exactly wrong for a list that can hold 10+ items and needs to stay open while scrolled. `Dialog` (via `Modal`) is fundamentally centered-and-backdropped and has no anchored-positioning concept at all — reaching this component's actual requirements (anchored next to the chip, invisible backdrop, no header) meant fighting `Dialog` with more overrides each round rather than using the primitive built for exactly this (`Popover`, the same one MUI's own menus and filter dropdowns are built from).
- **Yes:** `Popover`'s default invisible backdrop (`slotProps.backdrop` merges in `{ invisible: true }` internally) is used as-is — it already satisfies "not grayed/opaque" while still closing on outside-click, so no extra CSS or props are needed for that requirement.
- **Yes:** anchored via a `chipRef` (`useRef<HTMLDivElement>`) passed both as the chip's `ref` and `Popover`'s `anchorEl` — `MuiChip`'s root is always a `div` (even when clickable, `Chip` forces `ButtonBase`'s `component` back to `'div'`), so `HTMLDivElement` is the correct ref type.
- **Yes:** `anchorOrigin: { vertical: 'bottom', horizontal: 'left' }` / `transformOrigin: { vertical: 'top', horizontal: 'left' }` — opens just below-left of the chip, the closest match to "like a tooltip" without covering the chip itself.
- **Yes:** the paper's max-width lives in `ListChip.css` (`.list-chip__popover`, applied directly via `slotProps.paper.className` — no descendant selector needed here, unlike the old `Dialog` version) and still needs `!important`: `Popover`'s own `PopoverPaper` styled-component already sets `max-width: calc(100% - 32px)` as a real rule, which otherwise wins the cascade.
- **No:** wiring `ListChip` into any existing screen in this spec — kept as a standalone, reusable component; scope confirmed with user.
- **No:** supporting non-string array items — the immediate need is `string[]`; a generic `T[]` version can be a follow-up spec if it comes up.

## Risks

| Risk                                                                                                                                                                      | Mitigation                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A very long `items` array makes the popover list unwieldy                                                                                                                 | The `50vh` max-height + vertical scroll on the list container keeps the popover itself bounded; no virtualization needed for this spec's scope.                                                                     |
| Duplicate strings in `items` break React's list `key` uniqueness                                                                                                          | Key items by `` `${item}-${index}` `` instead of the raw string.                                                                                                                                                    |
| jsdom has no real layout engine, so `max-height: 50vh`/`max-width: 240px` can't be asserted by actual pixel measurements                                                  | Verify via the `list-chip__list`/`list-chip__popover`/`list-chip__item` classes being applied to the right elements (same layout-limited-test pattern already used by `TruncatedText.test.tsx`), not computed size. |
| A 240px-wide popover easily wraps or clips longer item strings, since no truncation was requested                                                                         | Out of scope for now — `ListItemText`'s default wrapping just breaks long strings onto more lines; revisit with `TruncatedText` inside the list in a follow-up spec if it becomes a real case.                      |
| `Popover` renders near the viewport edge could get repositioned by its own `marginThreshold` (default `16`), landing somewhere other than strictly below-left of the chip | This is `Popover`'s own built-in collision handling, not a bug; not overridden since no specific edge behavior was requested.                                                                                       |

## What is **not** in this spec

- Wiring `ListChip` into any existing screen, table, or column.
- Support for non-string array items.
- Search, filter, or virtualization inside the popover's list.

Each one of those, if it lands, goes in its own spec.
