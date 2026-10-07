// Purchase Order Dispatch Status — TanStack Query layer.
//
// Confirmed directly with the user (2026-10-07); not yet in
// docs/especificacion-endpoints-backend. A numPedido-keyed pair, distinct
// from the avisoId-keyed Dispatch Notices API (dispatch-notices.ts, § 2):
// the master list answers "which POs are pending/dispatched/erroed", the
// detail fetches one PO's full Orden→Tienda→Contenedor→Producto tree by
// numPedido. Route paths (`/ordenes-compra/despacho`, `.../despacho/{numPedido}`)
// are a naming choice mirroring the existing `/ordenes-compra` family, not a
// confirmed contract — adjust if the backend lands on different paths.
//
// No MSW mock handlers exist yet for these routes (see src/mocks/handlers) —
// calls will 404 against the dev mock server until those are added.

import { queryOptions } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './http'
import { queryKeys } from './query-keys'
import type {
  Paginated,
  PurchaseOrderDispatchDetail,
  PurchaseOrderDispatchQuery,
  PurchaseOrderDispatchSummary,
} from './types'

export function purchaseOrderDispatchListQueryOptions(
  query: PurchaseOrderDispatchQuery = {},
) {
  return queryOptions({
    queryKey: queryKeys.purchaseOrderDispatch.list(query),
    queryFn: ({ signal }) =>
      apiFetch<Paginated<PurchaseOrderDispatchSummary>>(
        `/ordenes-compra/despacho${buildQuery({ ...query })}`,
        { signal },
      ),
  })
}

export function purchaseOrderDispatchDetailQueryOptions(numPedido: string) {
  return queryOptions({
    queryKey: queryKeys.purchaseOrderDispatch.detail(numPedido),
    queryFn: ({ signal }) =>
      apiFetch<PurchaseOrderDispatchDetail>(
        `/ordenes-compra/despacho/${encodeURIComponent(numPedido)}`,
        { signal },
      ),
    enabled: numPedido.length > 0,
  })
}
