// Build the literal `{ ordenes: [...] }` JSON Homecenter's AvisoDespacho
// endpoint expects — the same shape as the real sample payloads under
// `docs/avisos_despacho/*.json`.
//
// `GET /avisos-despacho/por-fecha` already returns each order in exactly
// this shape (string `cantidad`/`peso`/`volumen` included), so the only work
// left is stamping `fechaRealDespacho`, which the API leaves `null` until the
// PO is dispatched.
//
// Deliberately its own export shape, not `CreateDispatchNoticeRequest` (the
// platform's own `/api/v1/avisos-despacho` body): the sample payloads wrap one
// or more orders under `ordenes[]` and carry `eanPuntoEntrega` per order.

import type { DispatchPreviewOrder } from '#/api/types'

export interface DispatchNoticePayloadOrder extends Omit<
  DispatchPreviewOrder,
  'fechaRealDespacho'
> {
  fechaRealDespacho: string
}

export interface DispatchNoticePayload {
  ordenes: Array<DispatchNoticePayloadOrder>
}

/** `YYYY-MM-DD` — the date the notice is actually being generated/sent, not
 *  the PO's originally committed delivery window. */
export const todayIsoDate = (): string => new Date().toISOString().slice(0, 10)

/** One or more API orders → the full `{ ordenes: [...] }` payload, in the
 *  order given. An order that already has a real dispatch date keeps it;
 *  the rest get `fechaRealDespacho`. */
export function toDispatchNoticePayload(
  orders: Array<DispatchPreviewOrder>,
  fechaRealDespacho: string = todayIsoDate(),
): DispatchNoticePayload {
  return {
    ordenes: orders.map((order) => ({
      eanPuntoEntrega: order.eanPuntoEntrega,
      ordenCompra: order.ordenCompra,
      fechaRealDespacho: order.fechaRealDespacho ?? fechaRealDespacho,
      tiendas: order.tiendas,
    })),
  }
}
