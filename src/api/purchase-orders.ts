// Purchase Orders — TanStack Query layer (spec § 1).

import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import JSZip from 'jszip'
import { apiFetch, buildQuery } from './http'
import { normalizeOrderStatus } from './order-status'
import { queryKeys } from './query-keys'
import type {
  GeneratePurchaseOrdersPdfRequest,
  PurchaseOrderDetail,
  PurchaseOrderLabelsRequest,
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
      ).then((page) => ({
        ...page,
        data: page.data.map((o) => ({
          ...o,
          estado: normalizeOrderStatus(o.estado),
        })),
      })),
  })
}

export function purchaseOrderDetailQueryOptions(ordenCompra: string) {
  return queryOptions({
    queryKey: queryKeys.purchaseOrders.detail(ordenCompra),
    queryFn: ({ signal }) =>
      apiFetch<PurchaseOrderDetail>(
        `/ordenes-compra/${encodeURIComponent(ordenCompra)}`,
        { signal },
      ).then((detail) => ({
        ...detail,
        cabecera: {
          ...detail.cabecera,
          estado: normalizeOrderStatus(detail.cabecera.estado),
        },
      })),
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
function fetchPurchaseOrdersExport(
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
 * {@link downloadPurchaseOrdersCsv} as a mutation. The backend flags each
 * successfully exported order `exportada`, so the order queries are
 * refetched afterwards — on settle rather than success, because a
 * multi-order export can fail partway after some orders were already
 * flagged.
 */
export function useExportPurchaseOrdersCsv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: downloadPurchaseOrdersCsv,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all(),
      })
    },
  })
}

/** `POST /api/v1/ordenes-compra/generar-pdf` — a single PDF covering every
 *  given order that exists (unknown ones are silently skipped; `404` when
 *  none exist). Not in the backend spec; the backend wraps Homecenter's
 *  `GenerarPdf` and answers `502 HOMECENTER_GENERAR_PDF_NO_DISPONIBLE` when
 *  Homecenter fails. */
function fetchPurchaseOrdersPdf(
  request: GeneratePurchaseOrdersPdfRequest,
): Promise<Blob> {
  return apiFetch<Blob>('/ordenes-compra/generar-pdf', {
    method: 'POST',
    body: request,
    headers: { Accept: 'application/pdf' },
  })
}

/** Triggers a browser download of the generated PDF for one or more
 *  purchase orders — `orden-{ordenCompra}.pdf` for a single order,
 *  `ordenes-compra.pdf` when several are combined. */
export async function downloadPurchaseOrdersPdf(
  ordenCompras: Array<string>,
): Promise<void> {
  const blob = await fetchPurchaseOrdersPdf({ ordenes: ordenCompras })
  triggerDownload(
    blob,
    ordenCompras.length === 1
      ? `orden-${ordenCompras[0]}.pdf`
      : 'ordenes-compra.pdf',
  )
}

/** `GET /api/v1/ordenes-compra/{ordenCompra}/etiquetas/{numTags}` — the
 *  barcode labels PDF for an order, `numTags` copies. */
function fetchPurchaseOrderLabels({
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
