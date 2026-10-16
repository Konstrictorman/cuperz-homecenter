// Purchase Orders — TanStack Query layer (spec § 1).

import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import JSZip from 'jszip'
import { mocksEnabled } from '#/mocks/enable'
import { apiFetch, buildQuery } from './http'
import { queryKeys } from './query-keys'
import type {
  PurchaseOrderDetail,
  PurchaseOrderLabelsRequest,
  PurchaseOrdersQuery,
  PurchaseOrderSummary,
  Paginated,
  ReprocessOrderResponse,
  SyncPurchaseOrdersRequest,
  SyncPurchaseOrdersResponse,
  UpdatePurchaseOrderRequest,
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

/** `PATCH /api/v1/ordenes-compra/{ordenCompra}` — not in the backend spec.
 *  Response body unconfirmed, so it isn't typed. */
export function updatePurchaseOrder(
  ordenCompra: string,
  body: UpdatePurchaseOrderRequest,
): Promise<unknown> {
  return apiFetch<unknown>(
    `/ordenes-compra/${encodeURIComponent(ordenCompra)}`,
    {
      method: 'PATCH',
      body,
    },
  )
}

/** `GET /api/v1/ordenes-compra/export` (§ 1.5) — returns CSV as text. */
export function fetchPurchaseOrdersExport(
  query: PurchaseOrdersQuery = {},
): Promise<string> {
  return apiFetch<string>(`/ordenes-compra/export${buildQuery({ ...query })}`)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Triggers a browser download of the purchase-order export CSV for one or
 * more orders. The endpoint only accepts a single `ordenCompra` per request
 * (§ 1.5), so exporting several orders issues one request per order; each
 * order's CSV is kept as its own file, bundled into a single zip when more
 * than one order is exported.
 */
export async function downloadPurchaseOrdersCsv(
  ordenCompras: Array<string>,
): Promise<void> {
  const responses = await Promise.all(
    ordenCompras.map((ordenCompra) =>
      fetchPurchaseOrdersExport({ ordenCompra }),
    ),
  )

  if (ordenCompras.length === 1) {
    triggerDownload(
      new Blob([responses[0]], { type: 'text/csv;charset=utf-8' }),
      `orden-${ordenCompras[0]}.csv`,
    )
    return
  }

  const zip = new JSZip()
  ordenCompras.forEach((ordenCompra, index) => {
    zip.file(`orden-${ordenCompra}.csv`, responses[index])
  })
  const zipBlob = await zip.generateAsync({ type: 'blob' })

  triggerDownload(zipBlob, 'ordenes-compra.zip')
}

/**
 * Hits our own real server route — `/api/purchase-orders/{ordenCompra}/pdf`
 * — which proxies Homecenter's `GenerarPdf` endpoint directly. This is the
 * mock-era path: it bypasses the `/api/v1` mock layer entirely (see
 * `src/routes/api/purchase-orders/$ordenCompra/pdf.ts`), since there's no
 * useful way to fake PDF bytes, so it always makes a real call to Homecenter
 * even while the rest of the app runs against MSW.
 */
async function fetchPdfViaHomecenterProxy(ordenCompra: string): Promise<Blob> {
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

  return response.blob()
}

/**
 * Once the platform's own FastAPI backend is live (`VITE_ENABLE_MOCKS=false`,
 * see [[homecenter-fastapi-backend]] / CLAUDE.md), the backend generates the
 * PDF itself via its own `POST /api/v1/ordenes-compra/generar-pdf` — no need
 * for our Homecenter-proxying server route in that mode.
 */
function fetchPdfViaBackend(ordenCompra: string): Promise<Blob> {
  return apiFetch<Blob>('/ordenes-compra/generar-pdf', {
    method: 'POST',
    body: { ordenes: [ordenCompra] },
  })
}

function fetchPurchaseOrderPdf(ordenCompra: string): Promise<Blob> {
  return mocksEnabled()
    ? fetchPdfViaHomecenterProxy(ordenCompra)
    : fetchPdfViaBackend(ordenCompra)
}

/** Triggers a browser download of the generated PDF for a purchase order. */
export async function downloadPurchaseOrderPdf(
  ordenCompra: string,
): Promise<void> {
  const blob = await fetchPurchaseOrderPdf(ordenCompra)
  triggerDownload(blob, `orden-${ordenCompra}.pdf`)
}

/** `GET /api/v1/ordenes-compra/{ordenCompra}/etiquetas/{numTags}` — the
 *  barcode labels PDF for an order, `numTags` copies. */
export function fetchPurchaseOrderLabels({
  ordenCompra,
  numTags,
}: PurchaseOrderLabelsRequest): Promise<Blob> {
  return apiFetch<Blob>(
    `/ordenes-compra/${encodeURIComponent(ordenCompra)}/etiquetas/${numTags}`,
    { headers: { Accept: 'application/pdf' } },
  )
}

/** Triggers a browser download of an order's barcode labels PDF. */
export async function downloadPurchaseOrderLabels(
  request: PurchaseOrderLabelsRequest,
): Promise<void> {
  const blob = await fetchPurchaseOrderLabels(request)
  triggerDownload(blob, `etiquetas-${request.ordenCompra}.pdf`)
}

/**
 * Generates the PDF for each given order and bundles them into a single
 * `purchase-orders-pdf.zip` download — one request per order, same as
 * {@link downloadPurchaseOrderPdf}.
 */
export async function downloadPurchaseOrdersPdfZip(
  ordenCompras: Array<string>,
): Promise<void> {
  const blobs = await Promise.all(ordenCompras.map(fetchPurchaseOrderPdf))

  const zip = new JSZip()
  ordenCompras.forEach((ordenCompra, index) => {
    zip.file(`orden-${ordenCompra}.pdf`, blobs[index])
  })
  const zipBlob = await zip.generateAsync({ type: 'blob' })

  triggerDownload(zipBlob, 'purchase-orders-pdf.zip')
}
