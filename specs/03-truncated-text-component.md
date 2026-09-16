# SPEC 03 — Truncated text component

> **Status:** Approved
> **Depends on:** None
> **Date:** 2026-09-16
> **Objective:** Add a reusable `TruncatedText` component that clamps long text to a configurable number of lines with a CSS ellipsis and shows the full text in a tooltip only while it is actually overflowing.

## Why this spec exists

Two parts of this are not obvious enough to leave implicit:

- Detecting "is this actually truncated" differs by truncation mode: single-line ellipsis overflows horizontally (`scrollWidth` vs `clientWidth`), multi-line clamp overflows vertically (`scrollHeight` vs `clientHeight`). The component has to branch on `lines` to measure the right axis.
- The component fills 100% of its parent's width (confirmed sizing model), so its overflow state can change after mount — a sidebar collapsing or the window resizing can turn a fitting text into a truncated one, or the reverse. That requires a `ResizeObserver`, not a mount-only check, and jsdom (this project's Jest environment) doesn't implement one, so a small stub needs to join the existing `matchMedia`/`scrollTo` stubs in `test/jest.setup.ts`.

## Scope

**In:**

- New component at `src/components/truncatedText/TruncatedText.tsx` + `TruncatedText.css`, following the existing `src/components/<name>/<Name>.{tsx,css}` convention (`statusBadge`, `toolBar`, `dataTable`, etc.).
- Props: `text: string` (required, the full text to render/measure/tooltip), `lines?: number` (default `1`), `className?: string`.
- CSS-only truncation: `lines === 1` renders single-line ellipsis (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`); `lines > 1` renders multi-line clamp (`-webkit-box` + `-webkit-line-clamp`), with the `-webkit-line-clamp` value applied inline (it's a dynamic prop, not a fixed set of modifier classes).
- Overflow detection via a ref + `ResizeObserver`: compares `scrollWidth`/`clientWidth` when `lines === 1`, `scrollHeight`/`clientHeight` when `lines > 1`. Re-measures on mount, whenever `text`/`lines` change, and whenever the observed element resizes.
- The text is wrapped in MUI `Tooltip` (`title={text}`, already used elsewhere, e.g. `ToolBar.tsx`), with its hover/focus/touch listeners disabled whenever the text is not overflowing — so the tooltip only ever appears in the truncated state.
- `TruncatedText.stories.tsx`: stories for short text (no truncation, no tooltip), single-line truncation, and multi-line truncation (`lines={3}` or similar).
- `TruncatedText.test.tsx`: unit tests per the acceptance criteria, stubbing `scrollWidth`/`clientWidth`/`scrollHeight`/`clientHeight` via `Object.defineProperty` since jsdom has no real layout engine.
- A minimal `ResizeObserver` stub added to `test/jest.setup.ts`, guarded the same way as the existing `window`-only stubs there.

**Out of scope (for future specs):**

- Wiring `TruncatedText` into any existing screen or DataGrid column (`PurchaseOrdersTable`, `PurchaseOrderDetailModal`, etc.) — this spec only builds the standalone component.
- A `maxWidth`/fixed-size variant — the component always fills its parent; sizing is the caller's responsibility.
- Copy-to-clipboard, "show more/less" expand-in-place, or any interaction beyond the hover/focus tooltip.
- RTL/CJK-specific line-clamp edge cases beyond native `-webkit-line-clamp` browser support.

## Data model

This feature introduces no domain/business data structures — it's a presentation-only UI component. Its only "data" is its own props and a small piece of internal UI state:

```ts
// src/components/truncatedText/TruncatedText.tsx
export interface TruncatedTextProps {
  /** Full text to render, truncate, and show in the tooltip. */
  text: string
  /** Number of lines before truncating. Default: 1 (single-line ellipsis). */
  lines?: number
  className?: string
}

// internal, not exported
const [isOverflowing, setIsOverflowing] = useState(false)
```

`TruncatedText.css`, BEM-style like the rest of the components:

```css
.truncated-text {
  display: block;
  width: 100%;
  overflow: hidden;
}
.truncated-text--single-line {
  white-space: nowrap;
  text-overflow: ellipsis;
}
.truncated-text--multi-line {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
}
```

## Implementation plan

1. Scaffold `src/components/truncatedText/TruncatedText.tsx` with the props above, rendering `text` inside a ref'd element with the `.truncated-text` + (`--single-line` | `--multi-line`) classes — no tooltip/overflow logic yet.
2. Add `TruncatedText.css` with the rules shown above.
3. Implement overflow detection: measure `scrollWidth`/`clientWidth` (single-line) or `scrollHeight`/`clientHeight` (multi-line) on the ref'd element, on mount and on `text`/`lines` change, and attach a `ResizeObserver` on that same element to re-measure when its size changes; store the result in `isOverflowing`.
4. Wrap the ref'd element in MUI `Tooltip` (`title={text}`), passing `disableHoverListener={!isOverflowing}`, `disableFocusListener={!isOverflowing}`, `disableTouchListener={!isOverflowing}`.
5. Add the `ResizeObserver` stub to `test/jest.setup.ts`, inside the existing `typeof globalThis.window !== 'undefined'` guard.
6. Write `TruncatedText.test.tsx` covering the acceptance criteria below.
7. Write `TruncatedText.stories.tsx` with the three example stories (short text, single-line truncation, multi-line truncation).
8. Leftover sweep: `npm run lint`, `npm test`, `npm run build`.

## Acceptance criteria

- [ ] `TruncatedText` renders `text` unmodified when it fits within its container (no ellipsis, tooltip disabled).
- [ ] With `lines` unset (default `1`) and text wider than its container, the text is visually clipped to one line with a CSS ellipsis.
- [ ] With `lines={3}` (or any N>1) and text taller than N lines, the text is clipped to N lines, not 1.
- [ ] Hovering a truncated `TruncatedText` shows a tooltip containing the full, untruncated `text`.
- [ ] Hovering a non-truncated `TruncatedText` shows no tooltip.
- [ ] Focusing a truncated `TruncatedText` via keyboard also reveals the tooltip (MUI `Tooltip`'s default focus behavior).
- [ ] Resizing the observed container from "fits" to "overflows" (or back) updates the tooltip's enabled state without remounting the component.
- [ ] `TruncatedText.stories.tsx` includes at least: short text (no truncation), single-line truncation, and multi-line truncation stories.
- [ ] `npm run lint`, `npm test`, and `npm run build` all succeed.

## Decisions

- **Yes:** plain `text: string` prop, not `children: ReactNode` — needed to reliably measure overflow and to pass the exact same content to the tooltip.
- **Yes:** `lines` prop, default `1` — single-line is the common case, but multi-line callers don't need a second component.
- **Yes:** MUI `Tooltip` with its hover/focus/touch listeners toggled by `isOverflowing`, instead of conditionally rendering the tooltip only when needed — keeps a single stable component tree (no ref/mount churn) and matches how `Tooltip` is already used in `ToolBar.tsx`.
- **Yes:** `ResizeObserver`-based re-check, with a small stub added to `test/jest.setup.ts` — the component fills 100% of its parent by design, so its overflow state can change after mount (window resize, sidebar collapse); a mount-only check would leave a stale tooltip state.
- **No:** wiring the component into any existing screen — kept as a pure, isolated component per the confirmed scope; integration is a follow-up spec once real use sites are picked.
- **No:** a `maxWidth` prop — the component always fills its parent; sizing is the caller's responsibility via layout.
- **No:** copy-to-clipboard / expand-in-place interactions — not requested, out of scope.

## Risks

| Risk                                                                                                                                                                   | Mitigation                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| jsdom has no real layout engine, so `scrollWidth`/`clientWidth`/`scrollHeight`/`clientHeight` are always `0` in Jest, which would make every text look non-overflowing | Tests stub these properties directly on the DOM node via `Object.defineProperty` for both the "overflowing" and "not overflowing" cases — a standard RTL technique                                                       |
| `-webkit-line-clamp` is a prefixed property; very old browsers without support would show unclamped multi-line text                                                    | Supported by all current evergreen browsers (Chrome/Edge/Firefox/Safari); not a concern for an internal authenticated platform                                                                                           |
| Adding a global `ResizeObserver` stub to `jest.setup.ts` could mask a real missing-observer bug in some unrelated future test                                          | The stub only guards `typeof window !== 'undefined'`, mirrors the existing `matchMedia`/`scrollTo` stubs, and is a no-op observer — any test asserting real resize behavior still has to trigger its callback explicitly |

## What is **not** in this spec

- Wiring `TruncatedText` into `PurchaseOrdersTable`, `PurchaseOrderDetailModal`, or any other screen.
- A `maxWidth`/fixed-size variant.
- Copy-to-clipboard or expand-in-place interactions.
- RTL/CJK-specific line-clamp handling beyond native browser support.

Each one of those, if it lands, goes in its own spec.
