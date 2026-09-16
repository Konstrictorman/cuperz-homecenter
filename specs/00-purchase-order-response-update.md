# SPEC 00 — Purchase order response alignment

> **Status:** Approved
> **Depends on:** None
> **Date:** 2026-09-15
> **Objective:** Rewrite the Órdenes de Compra endpoint documentation and the platform's `PurchaseOrderDetail`/`PurchaseOrderLineItem` types to match a real `GetOrdenesDeCompra` response field-for-field, including the Producto→Tienda nesting Homecenter actually uses.

## Amendment (post-implementation)

After this spec was implemented, it was clarified that **date-format normalization is exclusively the backend's responsibility** — Homecenter's raw date/datetime shapes (including the `dd/mm/yyyy HH:mm:ss` 24h format this spec introduced parsing for) never reach the frontend; the backend converts everything to the platform's own ISO 8601 format before responding. Accordingly:

- `parseHomecenterFecha24h` was removed from `src/api/homecenterOrderFields.ts` and its test — it had zero production call sites to begin with (the mock layer generates already-clean data directly; it never parses raw JSON), so removing it has no ripple.
- **Follow-up resolved:** `nullIfSentinel` was also removed, for the same reason — sentinel-to-null translation (`CODIGO_SESION_RECIBO: -1`, `STICKER: "-1"`) is the same category of raw-Homecenter-quirk handling as date parsing, and the backend delivers the already-translated value. `src/api/homecenterOrderFields.ts` is deleted entirely (empty once both functions were gone). `PurchaseOrderDetail.sticker`/`tipoDocumento` stay typed exactly as they were — `string | null` — since that was already correct either way.
- `docs/especificacion-endpoints-backend (2).md` was updated with an explicit disclaimer (see "Convenciones generales") that no raw Homecenter date format ever reaches `/api/v1/...` responses.
- The mock's `toHomecenterFecha24h` (`db.ts`) is unaffected — it goes the opposite direction (clean → raw) and exists only to simulate the *unprocessed* payload `hc_integracion_log` stores for audit, which is a mock-realism concern, not frontend date-transformation logic.

The rest of this document is left as originally written for historical context, except where directly superseded below.

## Why this spec exists

Every purchase-order type in this repo (`PurchaseOrderDetail`, `PurchaseOrderStore`, `PurchaseOrderLineItem`) was modeled off a Postman example, not a confirmed Homecenter payload. A real response reveals two kinds of gaps: a **structural** one (Homecenter nests the store breakdown under each product — `PRODUCTOS[].TIENDAS[]` — while the platform's types nest it the other way, `tiendas[].productos[]`) and a **field** one (~30 raw fields, from order financials to a billing-address block, have no type at all today). This spec closes both, for this one endpoint.

**Numbering note:** this is `00` because it's the foundational shape the other two purchase-order specs build on top of, not because it has a hard dependency on them. It does *not* depend on SPEC 01 (status tones/registry — untouched here, `ESTADO_OC`/`ESTADO_SKU`/`TIPO_OC` all stay opaque strings in this spec) or SPEC 02 (date-field renames — untouched here). It does share one file with SPEC 02: both add fields to `PurchaseOrderDetail`, and both need a "Homecenter datetime string → `IsoDateTime`" parser. To keep this spec independently implementable first, it introduces its **own** parser for the 24h datetime shape (`FECHA_MIN_ENTREGA`/`FECHA_MAX_ENTREGA`/`FECHA_CANCELACION`) rather than reaching into SPEC 02's file — see Decisions.

## Scope

**In:**

- Pivot `PurchaseOrderDetail`'s hierarchy from `tiendas[].productos[]` to `productos[].tiendas[]`, matching the real response. `PurchaseOrderStore` is removed, replaced by `PurchaseOrderLineStore` (the small per-product store-quantity split).
- Add every remaining order-level field from the real response (financials, carrier, delivery window, cancellation date, sticker, order/document type, buyer contact, delivery-address extras, a billing-address block, sales/billing store EANs, locality, buyer company EAN, free-text observations) to `PurchaseOrderDetail`.
- Add the 5 missing product-line fields (`SKU`, `COSTO_SKU`, `CONDICION_PAGO`, `DESCUENTO_SKU`, `UNIDAD_VENTA`) to `PurchaseOrderLineItem`.
- A new `parseHomecenterFecha24h` helper for the plain `dd/mm/yyyy HH:mm:ss` datetime shape, and a `nullIfSentinel` helper for Homecenter's `-1`-means-"no value" convention (seen on `CODIGO_SESION_RECIBO` and `STICKER`).
- Update `docs/especificacion-endpoints-backend (2).md` § 1.2 to the real shape.
- Adapt the API layer (`src/api/types.ts`, `src/api/purchase-orders.ts`) and the mock layer (`catalog.ts`, `db.ts`, `purchase-orders.ts` handler) so the app keeps compiling and running end-to-end on the new shape, with fully realistic faker-generated data for every new field.
- Minimal adaptation of `PurchaseOrderDetailModal.tsx`'s existing flattening logic to the new nesting — same visible columns, no redesign.

**Out of scope (for future specs):**

- Surfacing any of the ~30 new fields in the UI beyond what `PurchaseOrderDetailModal` already shows (carrier, delivery window, billing address, observations, etc. have no screen yet).
- `ESTADO_OC`/`ESTADO_SKU`/`TIPO_OC` code-prefix handling — `TIPO_OC` stays a raw opaque string here; `ESTADO_OC`/`ESTADO_SKU` are SPEC 01's registry.
- `FECHA_TRANSMISION` renaming and the `FECHA_PAGO`/negotiation-block fields — SPEC 02.
- Consolidating this spec's 24h-datetime parser with SPEC 02's `a. m./p. m.` parser into one shared module, if both land — flagged as a decision below, not done here.
- Confirming whether `PurchaseOrderLineStore.cantidad` values are guaranteed to sum to the line's `cantidadSolicitada` for a genuine multi-store order — no real sample with more than one populated store entry exists yet (both observed samples have a single `{EAN_TIENDA:"0", NOMBRE_TIENDA:"", CANTIDAD:0}` placeholder, consistent with `TIPO_DE_ORDEN: "ENTREGA_DIRECTA"`). Treated as a mock-data design choice only, not a confirmed Homecenter invariant.

## Data model

```ts
// src/api/types.ts

export interface PurchaseOrderBillingAddress {
  barrio: string
  ciudad: string
  departamento: string
  direccion: string
}

export interface PurchaseOrderLineStore {
  eanTienda: string
  nombreTienda: string
  cantidad: number
}

export interface PurchaseOrderLineItem {
  eanSku: string
  /** Homecenter's own internal product code (raw `SKU`), distinct from eanSku. */
  skuHomecenter: string
  descripcion: string
  cantidadSolicitada: number
  cantidadCancelada: number
  cantidadDevuelta: number
  estadoLinea: OrderLineStatus
  costoUnitario: number // raw COSTO_SKU
  condicionPago: string // raw CONDICION_PAGO, trimmed
  descuentoSku: number
  unidadVenta: string // raw UNIDAD_VENTA, trimmed
  tiendas: Array<PurchaseOrderLineStore>
}

export interface PurchaseOrderDetail {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  direccionEntrega: string
  barrioEntrega: string
  departamentoEntrega: string
  codigoDaneEntrega: string
  facturacion: PurchaseOrderBillingAddress
  estado: OrderStatus
  codigoSesionRecibo: string | null
  productos: Array<PurchaseOrderLineItem> // was: tiendas: Array<PurchaseOrderStore>
  costoTotalOc: number // raw COSTO_TOT_OC
  transportadora: string
  fechaMinEntrega: IsoDateTime | null
  fechaMaxEntrega: IsoDateTime | null
  fechaCancelacion: IsoDateTime | null
  sticker: string | null // raw "-1" → null
  tipoOc: string // raw, e.g. "4-Venta Empresa" — opaque, not parsed here
  tipoDocumento: string | null // raw -1 → null
  notaPedido: string
  cedulaComprador: string
  emailCliente: string
  telefonoCliente: string
  clienteRecibe: string
  eanTiendaVenta: string
  eanTiendaFacturacion: string
  localidad: string
  eanEmpresaCompradora: string
  tipoDeOrden: string
  tipoEntrega: string
  observaciones: string
  observacionesNpc: string
  observacionesNpl: string
}
```

`PurchaseOrderStore` is deleted. `PurchaseOrdersQuery.tienda` (store-EAN filter) keeps its name and signature; only its implementation in the mock handler changes (see plan).

`PurchaseOrderSummary` is **not** touched by this spec beyond what SPEC 01/02 already do — it stays a deliberately thin list-row projection. Two of its existing fields change *derivation*, not shape:

- `cantidadTiendas`: was `order.tiendas.length`; becomes the count of distinct `eanTienda` across `order.productos[].tiendas[]`.
- `cantidadTotalSolicitada`: was the sum of every line's `cantidadSolicitada`; becomes the raw `CANTIDAD_TOT_OC` value directly — confirmed to reconcile exactly with the summed lines in the one real sample checked (317 both ways), so trusting the source is simpler and no less correct.

```ts
// src/api/homecenterOrderFields.ts
/** Parses Homecenter's "dd/mm/yyyy HH:mm:ss" 24h datetime — used by
 *  FECHA_MIN_ENTREGA, FECHA_MAX_ENTREGA, FECHA_CANCELACION — into
 *  IsoDateTime. Empty string (the observed "no value" case) → null. */
export function parseHomecenterFecha24h(raw: string): IsoDateTime | null

/** Homecenter's sentinel-for-"no value" convention (CODIGO_SESION_RECIBO: -1,
 *  STICKER: "-1") is a value, not an empty string. Translates it to null. */
export function nullIfSentinel<T>(value: T, sentinel: T): T | null
```

Mock catalog additions (`src/mocks/data/catalog.ts`): `ProductCatalogEntry` gains `skuHomecenter` and `costoUnitario`; new constants for realistic generation — `CARRIERS` (e.g. carrier names seen in the sample, `"7-LOGISTICA PROPIA"`), `PAYMENT_CONDITIONS`, `SALE_UNITS`, `ORDER_TYPES` (`TIPO_OC` samples), `DELIVERY_TYPES` (`TIPO_DE_ORDEN`/`TIPO_ENTREGA` samples). `StoreCatalogEntry.nombre` (already present, currently unused by any type) becomes the source for `PurchaseOrderLineStore.nombreTienda`.

## Implementation plan

1. **Docs.** Rewrite § 1.2 of `docs/especificacion-endpoints-backend (2).md`: replace the `tiendas[].productos[]` example with a `productos[].tiendas[]` one carrying the full new field set; note that the example is now sourced from a real response, not the Postman collection.
2. **`types.ts` — structural pivot.** Delete `PurchaseOrderStore`; add `PurchaseOrderLineStore` and `PurchaseOrderBillingAddress`; rewrite `PurchaseOrderLineItem` (5 new fields + `tiendas`) and `PurchaseOrderDetail` (pivot + every new order-level field).
3. **`src/api/homecenterOrderFields.ts`.** New file: `parseHomecenterFecha24h`, `nullIfSentinel`.
4. **`src/api/purchase-orders.ts`.** Confirm the thin query-function wrappers still compile against the new `PurchaseOrderDetail` shape; update any inline comment that quotes the old field layout.
5. **`PurchaseOrderDetailModal.tsx`.** Flip the flattening: `detail.productos.flatMap(p => p.tiendas.map(t => ({ ..., sku: p.eanSku, tienda: t.nombreTienda })))` — same grid columns, same visual behavior, just reading the new shape. No new columns added in this step.
6. **Mock catalog.** Extend `ProductCatalogEntry` with `skuHomecenter`/`costoUnitario`; add `CARRIERS`/`PAYMENT_CONDITIONS`/`SALE_UNITS`/`ORDER_TYPES`/`DELIVERY_TYPES`.
7. **`db.ts` — record and generator rewrite.** Rewrite `PurchaseOrderRecord` to mirror the new `PurchaseOrderDetail` shape; replace `buildPurchaseOrderStores` with a products-first `buildPurchaseOrderLines` (per product, a synthetic 1–3-store quantity split summing to `cantidadSolicitada`, store names pulled from the catalog's `nombre`); update `makePurchaseOrder` to populate every new order-level field via faker/the new catalog constants; rewrite `purchaseOrderToHomecenterResponse` to mirror the real raw shape (`ORDEN_COMPRA`/`PUNTO_ENTREGA`/`PRODUCTOS[].TIENDAS[]`) instead of its previous invented one.
8. **`purchase-orders.ts` handler.** Update `toSummary`'s `cantidadTiendas`/`cantidadTotalSolicitada` derivation per the Data model note; update the `tienda` query filter to look inside `productos[].tiendas[]`; update `toDetail`.
9. **Tests.** Update any existing purchase-order assertions in `handlers.test.ts` that reference the old `tiendas[].productos[]` shape; add a small test for `parseHomecenterFecha24h` (the real `"30/08/2023 00:00:00"` sample and the empty-string case).
10. **Leftover sweep.** Grep for `PurchaseOrderStore` and any remaining `.tiendas.` access on a purchase-order value; run `npm run lint`, `npm test`, `npm run build`.

## Acceptance criteria

- [ ] `PurchaseOrderStore` no longer exists anywhere in `src/`.
- [ ] `PurchaseOrderDetail.productos[].tiendas[]` compiles and is the only path to store-level data for an order.
- [ ] `PurchaseOrderLineItem` has `skuHomecenter`, `costoUnitario`, `condicionPago`, `descuentoSku`, `unidadVenta`.
- [ ] `PurchaseOrderDetail` has all ~25 new order-level fields listed in the Data model section.
- [ ] ~~`parseHomecenterFecha24h(...)` returns the expected ISO datetime / `null`~~ — void per the Amendment above; the function was removed, date normalization is backend-only.
- [ ] ~~`nullIfSentinel(-1, -1)` returns `null`; `nullIfSentinel("262200481869", "-1")` returns `"262200481869"`~~ — void per the Amendment above; the function was removed, sentinel translation is backend-only.
- [ ] The Purchase Order Detail modal renders the same columns with the same data as before the pivot, for the canonical seeded order.
- [ ] The `tienda` (store EAN) filter on the purchase orders list still returns the correct orders after the pivot.
- [ ] `npm run lint`, `npm test`, and `npm run build` all succeed.

## Decisions

- **Yes:** pivot the types to `productos[].tiendas[]`, matching Homecenter exactly, rather than transposing at a boundary layer — the DTO should mirror the wire contract 1:1 since there's no real backend in this repo to hide the transform behind.
- **Yes:** everything from the response gets typed now, including low-value fields (billing address, buyer contact) — this spec's whole point is closing the gap against a confirmed real payload, so a partial pass would just create a second follow-up spec for the same JSON.
- **Yes:** fully realistic faker generation for every new field, including new catalog constants (carriers, payment conditions, etc.) — confirmed with the user.
- **No:** a new `cantidadTotalOc` field — folded into changing `cantidadTotalSolicitada`'s derivation instead, since the two values reconcile exactly and a duplicate field would just invite drift.
- **No:** reusing/importing SPEC 02's date parser for the 24h shape — a separate `parseHomecenterFecha24h` keeps this spec implementable independently of SPEC 02's landing order, at the cost of two small, similar parsers existing until someone consolidates them.
- **Yes:** `StoreCatalogEntry.nombre` (already in the mock catalog, unused until now) becomes the source for `nombreTienda` — no new catalog data needed for that one field.
- **No:** asserting `PurchaseOrderLineStore.cantidad` values sum to `cantidadSolicitada` as a confirmed Homecenter invariant — no real multi-store sample exists to verify it. The mock generator enforces the sum as a *design choice* for realistic fake data, documented as such, not presented as a verified fact.

## Risks

| Risk | Mitigation |
|---|---|
| Two near-duplicate Homecenter datetime parsers exist if SPEC 00 and SPEC 02 both land | Both are small and named distinctly (`parseHomecenterFecha24h` vs SPEC 02's `parseHomecenterDateTime`); flagged here for whoever implements second to consider consolidating |
| The store-quantity-sums-to-line-total assumption in mock data turns out wrong once a real multi-store sample arrives | Isolated to `buildPurchaseOrderLines` in `db.ts` — fixing it later doesn't touch any type or consuming component |
| Large simultaneous type/mock rewrite risks a half-migrated state if interrupted mid-implementation | Implementation plan orders steps so each one leaves `npm run build` passing — types (2-4) before mocks (6-8) before tests (9), never both halves changed in the same commit |

## What is **not** in this spec

- Any new UI screen or table column for the ~30 fields added here beyond what `PurchaseOrderDetailModal` already renders.
- `ESTADO_OC`/`ESTADO_SKU`/`TIPO_OC` code-prefix handling (SPEC 01 territory for the first two; `TIPO_OC` stays an opaque string everywhere).
- `FECHA_TRANSMISION`, `FECHA_PAGO`, and the negotiation block (SPEC 02).
- Consolidating this spec's date parser with SPEC 02's.
- Confirming the multi-store quantity-split invariant with Homecenter.

Each one of those, if it lands, goes in its own spec.
