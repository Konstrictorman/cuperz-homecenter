# SPEC 02 — Purchase order date field rename

> **Status:** Draft
> **Depends on:** None
> **Date:** 2026-09-15
> **Objective:** Rename the purchase order's date field and its query filters to `fechaTransmision`/`fechaTransmisionDesde`/`fechaTransmisionHasta` end-to-end, matching Homecenter's real `FECHA_TRANSMISION` source field, and add the still-unused `fechaPago`/`negociacion` fields to `PurchaseOrderDetail`.

## Why this spec exists

`PurchaseOrderSummary.fechaOrden` was originally modeled off a Postman example, not a confirmed Homecenter field. A real `GetOrdenesDeCompra` response has no field literally named "order date" — the closest match is `FECHA_TRANSMISION`, which is what `fechaOrden` is renamed to here. The same real response also has `FECHA_PAGO` and a "VE" negotiation/project-sale block, both entirely unmodeled today. Neither has a consuming screen yet, so both are added as optional, undocumented-in-UI fields — not wired into any component or mock generator.

**Revision note (2026-09-16):** this spec originally also planned a `parseHomecenterDateTime` utility for `FECHA_PAGO`'s messy Spanish-locale shape (`"12/07/2023 12:00:00 a. m."`). That's dropped: date-format normalization is exclusively the backend's responsibility (established in SPEC 00's amendment, see `docs/especificacion-endpoints-backend (2).md`, "Convenciones generales") — the backend converts every raw Homecenter date/datetime shape to ISO before the frontend ever sees it. `fechaPago` is just `IsoDateTime | null`, no parser needed.

## Scope

**In:**

- Rename `PurchaseOrderSummary.fechaOrden` → `fechaTransmision`, end-to-end: `PurchaseOrderRecord` (`db.ts`), the mock handler (`purchase-orders.ts`), `orderPresentation.ts`, and the presentation-layer `PurchaseOrder.fecha` row field (`PurchaseOrdersTable.tsx`) → `fechaTransmision`.
- Rename `PurchaseOrdersQuery.fechaDesde`/`fechaHasta` → `fechaTransmisionDesde`/`fechaTransmisionHasta`, scoped to purchase orders only — `DispatchNoticesQuery` and `IntegrationLogQuery` keep their own `fechaDesde`/`fechaHasta` untouched, since those filter different underlying dates (`fechaRealDespacho`, log `fecha`). Ripples into `OrdersFilterBar.tsx`'s `OrdersFilterValues` and the mock handler's query-param reads.
- Add `PurchaseOrderDetail.fechaPago?: IsoDateTime | null` — plain optional field, no parsing utility.
- Add `PurchaseOrderDetail.negociacion?: PurchaseOrderNegotiation`, a new type covering the raw `NEGOCIACION`/`VALOR_NEGOCIACION_VE`/`TIPO_ENTREGA_VE`/`CEDULA_VE`/`FECHA_NEGOCIACION_VE`/`CIUDAD_VE`/`DIRECCION_VE`/`DEPARTAMENTO_VE`/`BARRIO_VE`/`TELEFONO_VE`/`NIT_CONSTRUCTOR` fields — `fechaNegociacionVe` is `IsoDateTime | null`, already-normalized, no parser here either.
- Update `docs/especificacion-endpoints-backend (2).md` (§ 1.1, § 1.2, § 1.5) to match.

**Out of scope (for future specs):**

- Any UI surfacing `fechaPago` or `negociacion` — parked for whichever future page/role ends up needing them.
- Seeding `fechaPago`/`negociacion` in mock data — nothing reads them yet.
- Any Homecenter date/datetime parsing utility — that's the backend's job, not this repo's.
- Status/`StatusBadge` work — see SPEC 01.
- The rest of the Homecenter field gap (`COSTO_SKU`, `TRANSPORTADORA`, billing address, delivery windows, `SKU`/`CONDICION_PAGO`/`UNIDAD_VENTA`, etc.).
- Renaming `DispatchNoticesQuery`/`IntegrationLogQuery`'s own `fechaDesde`/`fechaHasta`.

## Data model

```ts
// src/api/types.ts
export interface PurchaseOrderSummary {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  ciudadEntrega: string
  cantidadTiendas: number
  cantidadTotalSolicitada: number
  estado: OrderStatus
  fechaTransmision: IsoDate // was fechaOrden
  ultimaActualizacion: IsoDateTime
}

export interface PurchaseOrdersQuery extends PaginationQuery {
  ordenCompra?: string
  estado?: OrderStatus
  fechaTransmisionDesde?: IsoDate // was fechaDesde
  fechaTransmisionHasta?: IsoDate // was fechaHasta
  tienda?: string
}

export interface PurchaseOrderNegotiation {
  negociacion: string
  valorNegociacionVe: string
  tipoEntregaVe: string
  cedulaVe: string
  fechaNegociacionVe: IsoDateTime | null
  ciudadVe: string
  direccionVe: string
  departamentoVe: string
  barrioVe: string
  telefonoVe: string
  nitConstructor: string
}

export interface PurchaseOrderDetail {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  direccionEntrega: string
  estado: OrderStatus
  codigoSesionRecibo: string | null
  tiendas: Array<PurchaseOrderStore>
  fechaPago?: IsoDateTime | null
  negociacion?: PurchaseOrderNegotiation
}
```

`fechaPago` and `negociacion` are both optional so no existing `PurchaseOrderRecord`/mock generator/handler is forced to populate them — the type accommodates the field, nothing downstream depends on it yet. Neither needs a parsing utility: both are already `IsoDateTime`-typed, on the assumption (confirmed for dates generally in SPEC 00's amendment) that the backend delivers them already normalized.

> Note: if SPEC 00 lands first, `PurchaseOrderDetail.tiendas: Array<PurchaseOrderStore>` above will already be `productos: Array<PurchaseOrderLineItem>` — this spec's `fechaPago`/`negociacion` additions apply the same either way, just onto whichever shape `PurchaseOrderDetail` has at the time.

## Implementation plan

1. **Docs.** In `docs/especificacion-endpoints-backend (2).md`: § 1.1 response example `"fechaOrden"` → `"fechaTransmision"`; § 1.1 query-param table `fechaDesde`/`fechaHasta` → `fechaTransmisionDesde`/`fechaTransmisionHasta` (note § 1.5 shares the same filters); § 1.2 detail example — add `fechaPago` and `negociacion` as new fields, marked as type-only / not yet surfaced in UI. No date-format disclaimer needed here — SPEC 00 already added the general one to "Convenciones generales".
2. **`types.ts`.** Rename `PurchaseOrderSummary.fechaOrden` → `fechaTransmision`; rename `PurchaseOrdersQuery.fechaDesde`/`fechaHasta` → `fechaTransmisionDesde`/`fechaTransmisionHasta`; add `PurchaseOrderNegotiation` and the two new optional fields on `PurchaseOrderDetail`.
3. **Presentation ripple.** `orderPresentation.ts` (`toPurchaseOrderRow`, `toPurchaseOrdersQuery`), `PurchaseOrdersTable.tsx` (`PurchaseOrder.fecha` → `fechaTransmision`), `OrdersFilterBar.tsx` (`OrdersFilterValues.fechaDesde`/`fechaHasta` → `fechaTransmisionDesde`/`fechaTransmisionHasta`, form field names, `DEFAULT_ORDERS_FILTER_VALUES`).
4. **Mocks.** `db.ts`: `PurchaseOrderRecord.fechaOrden` → `fechaTransmision`; `purchaseOrderToHomecenterResponse`'s `FECHA_ORDEN` → `FECHA_TRANSMISION`. `purchase-orders.ts` handler: `toSummary`, `filterPurchaseOrders` (search-param keys and local variable names), the sort comparator, `CSV_HEADER`, and the export row builder — all renamed.
5. **Leftover sweep.** Grep for any remaining `fechaOrden`/`fechaDesde`/`fechaHasta` tied to purchase orders (excluding `dispatch-notices.ts`/`integration-log.ts`, which intentionally keep their own copies); run `npm run lint`, `npm test`, `npm run build`.

## Acceptance criteria

- [ ] No occurrence of `fechaOrden` remains anywhere in `src/`.
- [ ] No occurrence of purchase-order-scoped `fechaDesde`/`fechaHasta` remains in `src/api/types.ts` (`PurchaseOrdersQuery`), `orderPresentation.ts`, `OrdersFilterBar.tsx`, or `purchase-orders.ts`.
- [ ] `DispatchNoticesQuery.fechaDesde`/`fechaHasta` and `IntegrationLogQuery.fechaDesde`/`fechaHasta` are unchanged.
- [ ] Filtering the Purchase Orders list by a date range in the UI still works end-to-end through the renamed params.
- [ ] `PurchaseOrderDetail` compiles with optional `fechaPago` and `negociacion`; no existing mock or handler code is forced to populate them.
- [ ] No date-parsing utility is added anywhere in `src/` as part of this spec.
- [ ] `npm run lint`, `npm test`, and `npm run build` all succeed.

## Decisions

- **Yes:** `fechaOrden` → `fechaTransmision`, confirmed end-to-end including the presentation-layer `PurchaseOrder.fecha` row field, per explicit request for consistency.
- **Yes:** `fechaDesde`/`fechaHasta` → `fechaTransmisionDesde`/`fechaTransmisionHasta`, scoped to `PurchaseOrdersQuery`/`OrdersFilterBar` only — `DispatchNoticesQuery`/`IntegrationLogQuery` keep their generic names since they filter different fields entirely; renaming those too would misrepresent what they filter by.
- **Yes:** `fechaPago`/`negociacion` added as optional, unused fields now rather than deferred entirely — the types exist for when a consuming spec needs them, at zero ripple cost today.
- **No:** seeding `fechaPago`/`negociacion` in mock data or wiring either into any component — nothing reads them yet, and fake data for an unused field would be untested surface with no verification path.
- **No:** a `parseHomecenterDateTime` utility (2026-09-16 correction) — date normalization is the backend's job; the frontend never receives Homecenter's raw datetime shapes, so there's nothing here to parse.

## What is **not** in this spec

- Any UI for `fechaPago` or `negociacion`.
- Any Homecenter date-parsing utility — backend's responsibility.
- The rest of the Homecenter field gap (pricing, addresses, delivery windows, `SKU`/`CONDICION_PAGO`/`UNIDAD_VENTA`).
- `DispatchNoticesQuery`/`IntegrationLogQuery` filter renames.
- Status/`StatusBadge` work — see SPEC 01.

Each one of those, if it lands, goes in its own spec.
