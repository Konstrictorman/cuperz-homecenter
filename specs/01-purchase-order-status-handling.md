# SPEC 01 — Purchase order status handling

> **Status:** Draft
> **Depends on:** None
> **Date:** 2026-09-15
> **Objective:** Give every `OrderStatus`/`OrderLineStatus` value its own distinct `StatusBadge` tone.

## Why this spec exists

`ORDER_LINE_STATUS_UI` in `src/routes/purchase-orders/details/orderPresentation.ts` already maps all 5 `OrderLineStatus` values, but three of them collapse onto tones that mean something else: `PARCIAL` reuses `processing` (the order-level "in sync" tone), and both `CANCELADA` and `SUPERA_SOLICITADO` reuse `error`, so a cancelled line and an over-quantity line render as the identical red chip.

**Revision note (2026-09-16):** this spec originally also planned a `src/api/homecenterStatus.ts` registry mapping Homecenter's raw, numeric-prefixed status codes (e.g. `"1-PENDIENTE"`) to the platform's clean `OrderStatus`/`OrderLineStatus` enums, with a `resolveOrderStatus`/`resolveOrderLineStatus` fallback resolver. That's dropped: per the same principle established for date formats in SPEC 00 (raw-Homecenter-quirk normalization is exclusively the backend's job — see `docs/especificacion-endpoints-backend (2).md`, "Convenciones generales"), the frontend never receives a raw prefixed status code to resolve; the backend delivers the clean enum value directly. This spec is now purely a presentation-layer fix.

The mock's Homecenter-echo builder (`purchaseOrderToHomecenterResponse` in `db.ts`) still needs to emit a realistic prefixed code for `ESTADO_SKU` — but that's simulating the *unprocessed* payload `hc_integracion_log` stores for audit (same reasoning as SPEC 00's `toHomecenterFecha24h`), not a frontend resolver. It stays a small mock-only lookup, not an exported API-layer utility.

## Scope

**In:**

- Extend `StatusBadgeTone` (`src/components/statusBadge/StatusBadge.tsx`) with `partial`, `cancelled`, `exceeded`.
- Add light/dark CSS rules for the 3 new tones in `StatusBadge.css`.
- Update `ORDER_LINE_STATUS_UI` directly in `orderPresentation.ts` so `PARCIAL`/`CANCELADA`/`SUPERA_SOLICITADO` resolve to `partial`/`cancelled`/`exceeded` instead of reusing `processing`/`error`. No new file — this is a straight edit to the existing map, since there's no raw-code resolution responsibility on the frontend.
- Storybook coverage for the 3 new tones.
- Mock data (`db.ts`): exercise `CANCELADA` (never generated today); add a small mock-only placeholder-code lookup so `purchaseOrderToHomecenterResponse`'s `ESTADO_SKU` emits a prefixed code (e.g. `"1-PENDIENTE"`) instead of the bare enum value, for audit-log realism only.
- A short doc note in `docs/especificacion-endpoints-backend (2).md` recording that Homecenter's raw status-code prefixes are placeholders pending confirmation, and that normalizing them to the clean enum is the backend's job (same framing as the date-format disclaimer SPEC 00 added).

**Out of scope (for future specs):**

- Confirming the real Homecenter numeric prefixes — still needs Homecenter, only `1-PENDIENTE` is observed.
- Any backend-side raw-code-to-enum resolver — that logic belongs in the (not-yet-built) Node.js backend, not this repo.
- `DispatchNoticeStatus` (`BORRADOR`/`ENVIADO`/`CON_NOVEDAD`/`ERROR_ENVIO`) and `IntegrationLogStatus` tone work — no UI wires these to `StatusBadge` yet.
- The rest of the Homecenter field gap (pricing, addresses, delivery windows, etc.).
- CSV export of purchase orders.

## Data model

```ts
// src/components/statusBadge/StatusBadge.tsx
export type StatusBadgeTone =
  | 'pending'
  | 'dispatched'
  | 'error'
  | 'processing'
  | 'partial'
  | 'cancelled'
  | 'exceeded'
```

```ts
// src/routes/purchase-orders/details/orderPresentation.ts (existing file, edited in place)
export const ORDER_LINE_STATUS_UI: Record<
  OrderLineStatus,
  { tone: StatusBadgeTone; label: string }
> = {
  PENDIENTE: { tone: 'pending', label: 'Pendiente' },
  DESPACHADA: { tone: 'dispatched', label: 'Despachada' },
  PARCIAL: { tone: 'partial', label: 'Parcial' },
  CANCELADA: { tone: 'cancelled', label: 'Cancelada' },
  SUPERA_SOLICITADO: { tone: 'exceeded', label: 'Supera solicitado' },
}
```

`ORDER_STATUS_UI` (the order-level map) is unchanged — `DESPACHADA`/`CON_ERROR`/`PROCESANDO` already have their own distinct tones today.

CSS additions in `StatusBadge.css` (new rules + `[data-theme='dark']` overrides, same pattern as the existing 4 tones):

| Tone | Family | Rationale |
|---|---|---|
| `partial` | `--status-info-*` | Unused by `StatusBadge` today; distinct hue |
| `cancelled` | `--status-error-*`, a darker step than today's `error` (e.g. `600/50` vs `300/50`) | Stays in the "negative" family, visually distinguishable from `CON_ERROR` |
| `exceeded` | `--status-warning-*`, a darker step than today's `pending` (e.g. `400/900` vs `100/800`) | A quantity anomaly reads closer to "caution" than "integration failure" |

Mock-only addition in `db.ts` (not exported, not part of the API layer):

```ts
// local to db.ts, used only by purchaseOrderToHomecenterResponse
const MOCK_ESTADO_SKU_CODE: Record<OrderLineStatus, string> = {
  PENDIENTE: '1-PENDIENTE',
  DESPACHADA: '2-DESPACHADA', // ⚠ placeholder, unconfirmed
  PARCIAL: '3-PARCIAL', // ⚠ placeholder, unconfirmed
  CANCELADA: '4-CANCELADA', // ⚠ placeholder, unconfirmed
  SUPERA_SOLICITADO: '5-SUPERA_SOLICITADO', // ⚠ placeholder, unconfirmed
}
```

## Implementation plan

1. **Docs.** Add a short "Códigos de estado Homecenter" note in `docs/especificacion-endpoints-backend (2).md` under § 1, stating that `ESTADO_OC`/`ESTADO_SKU` carry a numeric prefix, only `1-PENDIENTE` is confirmed, the rest are placeholders, and normalizing them to the clean enum is the backend's responsibility (mirroring the date-format disclaimer already there from SPEC 00).
2. **`StatusBadge.tsx` / `StatusBadge.css`.** Extend `StatusBadgeTone` with the 3 new members; add their light/dark CSS rules per the table above.
3. **`orderPresentation.ts`.** Update `ORDER_LINE_STATUS_UI` in place so `PARCIAL`/`CANCELADA`/`SUPERA_SOLICITADO` map to `partial`/`cancelled`/`exceeded`.
4. **`StatusBadge.stories.tsx`.** Add `Partial`/`Cancelled`/`Exceeded` stories; extend `argTypes.tone.options` and the `AllTones` story's rendered list.
5. **`db.ts` mocks.** Add a `CANCELADA` branch to the line-status assignment in `buildPurchaseOrderLines`; add the mock-only `MOCK_ESTADO_SKU_CODE` lookup and use it in `purchaseOrderToHomecenterResponse`'s `ESTADO_SKU` instead of the bare enum value.
6. **Leftover sweep.** Grep for any other place assuming only 4 tones exist; run `npm run lint`, `npm test`, `npm run build`.

## Acceptance criteria

- [ ] `StatusBadgeTone` includes `partial`, `cancelled`, `exceeded` alongside the existing 4.
- [ ] `StatusBadge.css` has both a light and a `[data-theme='dark']` rule for each of the 3 new tones.
- [ ] `ORDER_LINE_STATUS_UI.PARCIAL.tone === 'partial'`, `.CANCELADA.tone === 'cancelled'`, `.SUPERA_SOLICITADO.tone === 'exceeded'`.
- [ ] A Purchase Order Detail modal showing a cancelled line and one showing an over-quantity line render visibly different chip colors.
- [ ] Reloading the mock-seeded app produces at least one `CANCELADA` line status somewhere in the purchase orders list.
- [ ] `purchaseOrderToHomecenterResponse`'s `ESTADO_SKU` output matches the `N-CODE` shape (e.g. `"1-PENDIENTE"`), not a bare enum value.
- [ ] No new file is added under `src/api/` for status handling — confirms the registry/resolver approach was actually dropped, not just left unused.
- [ ] `npm run lint`, `npm test`, and `npm run build` all succeed.

## Decisions

- **Yes:** edit `ORDER_LINE_STATUS_UI` in place rather than introduce a new registry file — once the raw-code resolution responsibility moved to the backend, there was nothing left to justify a separate `src/api/homecenterStatus.ts` module; this is now a pure presentation fix, same shape as the map that already exists.
- **No:** a `resolveOrderStatus`/`resolveOrderLineStatus` frontend resolver, or any exported `homecenterCode`-to-enum mapping — that's the backend's job (2026-09-16 correction, applying the same principle as SPEC 00's date-format amendment).
- **Yes:** keep a placeholder-code lookup for the mock's audit-log echo (`purchaseOrderToHomecenterResponse`) — that's simulating the unprocessed raw exchange `hc_integracion_log` stores, not frontend business logic, so it's exempt from the above and stays local/unexported in `db.ts`.
- **Yes:** color families — `partial`→info, `cancelled`→error (darker step), `exceeded`→warning (darker step) — confirmed with the user.
- **No:** touching `DispatchNoticeStatus`/`IntegrationLogStatus` — no screen wires them to `StatusBadge` yet, so there's nothing to fix there today.
- **No:** renaming the existing `pending`/`dispatched`/`error`/`processing` tones — purely additive change.

## Risks

| Risk | Mitigation |
|---|---|
| Placeholder Homecenter codes in the mock's audit-log echo turn out wrong once confirmed | Isolated to one local constant in `db.ts`, not exported or consumed anywhere else — a one-line fix |

## What is **not** in this spec

- The real Homecenter status-code prefixes (needs Homecenter confirmation).
- Any frontend or backend raw-code-to-enum resolver — backend's responsibility, not specced here.
- `DispatchNoticeStatus`/`IntegrationLogStatus` tone wiring.
- The broader Homecenter field gap (pricing, addresses, delivery windows, negotiation block) — see SPEC 02.
- CSV export.

Each one of those, if it lands, goes in its own spec.
