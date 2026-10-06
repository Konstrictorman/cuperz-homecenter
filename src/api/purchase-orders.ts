// Purchase Orders — TanStack Query layer (spec § 1).

import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { apiFetch, buildQuery } from './http'
import { queryKeys } from './query-keys'
import type {
  PurchaseOrderDetail,
  PurchaseOrdersQuery,
  PurchaseOrderSummary,
  Paginated,
  ReprocessOrderResponse,
  SyncPurchaseOrdersRequest,
  SyncPurchaseOrdersResponse,
} from './types'

export function purchaseOrdersListQueryOptions(
  query: PurchaseOrdersQuery = {},
) {
  return queryOptions({
    queryKey: queryKeys.purchaseOrders.list(query),
    queryFn: ({ signal }) =>
      apiFetch<Paginated<PurchaseOrderSummary>>(
        `/ordenes-compra${buildQuery({ ...query })}`,
        { signal },
      ),
  })
}

export function purchaseOrderDetailQueryOptions(ordenCompra: string) {
  return queryOptions({
    queryKey: queryKeys.purchaseOrders.detail(ordenCompra),
    queryFn: ({ signal }) =>
      apiFetch<PurchaseOrderDetail>(
        `/ordenes-compra/${encodeURIComponent(ordenCompra)}`,
        { signal },
      ),
    enabled: ordenCompra.length > 0,
  })
}

/** `POST /api/v1/ordenes-compra/sincronizar` (§ 1.3) — 202, async. */
export function useSyncPurchaseOrders() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SyncPurchaseOrdersRequest) =>
      apiFetch<SyncPurchaseOrdersResponse>('/ordenes-compra/sincronizar', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all(),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.integrationLog.all(),
      })
    },
  })
}

/** `POST /api/v1/ordenes-compra/{ordenCompra}/reinyectar` (§ 1.4). */
export function useReprocessOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ordenCompra: string) =>
      apiFetch<ReprocessOrderResponse>(
        `/ordenes-compra/${encodeURIComponent(ordenCompra)}/reinyectar`,
        { method: 'POST' },
      ),
    onSuccess: (_data, ordenCompra) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all(),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(ordenCompra),
      })
    },
  })
}

/** `GET /api/v1/ordenes-compra/export` (§ 1.5) — returns CSV as text. */
export function fetchPurchaseOrdersExport(
  query: PurchaseOrdersQuery = {},
): Promise<string> {
  return apiFetch<string>(`/ordenes-compra/export${buildQuery({ ...query })}`)
}

/**
 * Triggers a browser download of Homecenter's generated PDF for an order.
 *
 * Hits our own real server route — `/api/purchase-orders/{ordenCompra}/pdf`
 * — which proxies Homecenter's `GenerarPdf` endpoint. This bypasses the
 * `/api/v1` mock layer entirely (see `src/routes/api/purchase-orders/
 * $ordenCompra/pdf.ts`), so it always makes a real call to Homecenter.
 */
export async function downloadPurchaseOrderPdf(
  ordenCompra: string,
): Promise<void> {
  const response = await fetch(
    `/api/purchase-orders/${encodeURIComponent(ordenCompra)}/pdf`,
  )

  if (!response.ok) {
    let message = `No se pudo generar el PDF de la orden ${ordenCompra}.`
    try {
      const body = (await response.json()) as {
        error?: { message?: string }
      }
      message = body.error?.message ?? message
    } catch {
      // response wasn't JSON — fall back to the generic message above
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `orden-${ordenCompra}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
