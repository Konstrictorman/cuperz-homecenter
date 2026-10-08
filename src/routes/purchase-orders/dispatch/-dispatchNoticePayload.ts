// Transform the Orden→Tienda→Contenedor→Producto tree
// (`PurchaseOrderDispatchDetail`, as returned per-PO by the dispatch list's
// detail endpoint) into the literal `{ ordenes: [...] }` JSON shape
// Homecenter's AvisoDespacho endpoint expects — the same shape as the real
// sample payloads under `docs/avisos_despacho/*.json`.
//
// This is deliberately its own export shape, not `CreateDispatchNoticeRequest`
// (the platform's own `/api/v1/avisos-despacho` body): the sample payloads
// wrap one or more orders under a top-level `ordenes[]`, carry
// `eanPuntoEntrega` per order, and — unlike the typed
// `DispatchNoticeProductInput` — represent `cantidad`/`peso`/`volumen` as
// strings, matching exactly what Homecenter's QA endpoint accepted (see
// docs/avisos_despacho).

import type { PurchaseOrderDispatchDetail } from '#/api/types'

export interface DispatchNoticePayloadProduct {
  eanSku: string
  cantidad: string
  peso: string
  volumen: string
}

export interface DispatchNoticePayloadContainer {
  contenedor: string
  productos: Array<DispatchNoticePayloadProduct>
}

export interface DispatchNoticePayloadStore {
  eanTienda: string
  contenedores: Array<DispatchNoticePayloadContainer>
}

export interface DispatchNoticePayloadOrder {
  eanPuntoEntrega: string
  ordenCompra: string
  fechaRealDespacho: string
  tiendas: Array<DispatchNoticePayloadStore>
}

export interface DispatchNoticePayload {
  ordenes: Array<DispatchNoticePayloadOrder>
}

/** `YYYY-MM-DD` — the date the notice is actually being generated/sent, not
 *  the PO's originally committed delivery window. */
export const todayIsoDate = (): string => new Date().toISOString().slice(0, 10)

/** One PO's detail tree → one entry of the payload's `ordenes[]`. */
export function toDispatchNoticePayloadOrder(
  detail: PurchaseOrderDispatchDetail,
  fechaRealDespacho: string,
): DispatchNoticePayloadOrder {
  return {
    eanPuntoEntrega: detail.eanPuntoEntrega,
    ordenCompra: detail.ordenCompra,
    fechaRealDespacho,
    tiendas: detail.tiendas.map((tienda) => ({
      eanTienda: tienda.eanTienda,
      contenedores: tienda.contenedores.map((contenedor) => ({
        contenedor: contenedor.contenedor,
        productos: contenedor.productos.map((producto) => ({
          eanSku: producto.eanSku,
          cantidad: String(producto.cantidad),
          peso: String(producto.peso),
          volumen: String(producto.volumen),
        })),
      })),
    })),
  }
}

/** One or more POs' details → the full `{ ordenes: [...] }` payload — one
 *  entry per PO, in the order the details were given. */
export function toDispatchNoticePayload(
  details: Array<PurchaseOrderDispatchDetail>,
  fechaRealDespacho: string = todayIsoDate(),
): DispatchNoticePayload {
  return {
    ordenes: details.map((detail) =>
      toDispatchNoticePayloadOrder(detail, fechaRealDespacho),
    ),
  }
}
