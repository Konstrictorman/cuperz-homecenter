// Dispatch Notices — TanStack Query layer (spec § 2).

import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { apiFetch, buildQuery } from './http'
import { normalizeOrderStatus } from './order-status'
import { queryKeys } from './query-keys'
import type {
  DispatchNoticeDetail,
  DispatchNoticeResult,
  DispatchNoticeEan128Response,
  DispatchNoticeAttemptsResponse,
  DispatchPreviewsQuery,
  DispatchPreviewsResponse,
  CreateDispatchNoticeRequest,
  ResendDispatchNoticeRequest,
  SendDispatchNoticeRequest,
  SendDispatchNoticeResponse,
} from './types'

/** `GET /api/v1/avisos-despacho` — one Orden→Tienda→Contenedor→Producto
 *  tree per PO, ready to drop into an AvisoDespacho payload. Not the § 2.2
 *  list of the backend spec; see the type's doc comment in `./types`. */
export function dispatchPreviewsQueryOptions(
  query: DispatchPreviewsQuery = {},
) {
  return queryOptions({
    queryKey: queryKeys.dispatchNotices.previews(query),
    queryFn: ({ signal }) =>
      apiFetch<DispatchPreviewsResponse>(
        `/avisos-despacho${buildQuery({ ...query })}`,
        { signal },
      ).then((res) => ({
        ...res,
        ordenes: res.ordenes.map((o) => ({
          ...o,
          estado: normalizeOrderStatus(o.estado),
        })),
      })),
  })
}

export function dispatchNoticeDetailQueryOptions(avisoId: string) {
  return queryOptions({
    queryKey: queryKeys.dispatchNotices.detail(avisoId),
    queryFn: ({ signal }) =>
      apiFetch<DispatchNoticeDetail>(
        `/avisos-despacho/${encodeURIComponent(avisoId)}`,
        { signal },
      ),
    enabled: avisoId.length > 0,
  })
}

/** `GET /api/v1/avisos-despacho/{avisoId}/ean128` (§ 2.4). */
export function dispatchNoticeEan128QueryOptions(avisoId: string) {
  return queryOptions({
    queryKey: queryKeys.dispatchNotices.ean128(avisoId),
    queryFn: ({ signal }) =>
      apiFetch<DispatchNoticeEan128Response>(
        `/avisos-despacho/${encodeURIComponent(avisoId)}/ean128`,
        { signal },
      ),
    enabled: avisoId.length > 0,
  })
}

/** `GET /api/v1/avisos-despacho/{avisoId}/intentos` (§ 2.6). */
export function dispatchNoticeAttemptsQueryOptions(avisoId: string) {
  return queryOptions({
    queryKey: queryKeys.dispatchNotices.attempts(avisoId),
    queryFn: ({ signal }) =>
      apiFetch<DispatchNoticeAttemptsResponse>(
        `/avisos-despacho/${encodeURIComponent(avisoId)}/intentos`,
        { signal },
      ),
    enabled: avisoId.length > 0,
  })
}

function invalidateDispatchNotice(
  queryClient: ReturnType<typeof useQueryClient>,
  avisoId?: string,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.dispatchNotices.all(),
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.integrationLog.all(),
  })
  if (avisoId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.dispatchNotices.detail(avisoId),
    })
  }
}

/** `POST /api/v1/avisos-despacho` (§ 2.1) — save draft or send. */
export function useCreateDispatchNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDispatchNoticeRequest) =>
      apiFetch<DispatchNoticeResult>('/avisos-despacho', {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => invalidateDispatchNotice(queryClient, data.avisoId),
  })
}

/** `POST /api/v1/avisos-despacho/{avisoId}/reenviar` (§ 2.5). */
export function useResendDispatchNotice(avisoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ResendDispatchNoticeRequest) =>
      apiFetch<DispatchNoticeResult>(
        `/avisos-despacho/${encodeURIComponent(avisoId)}/reenviar`,
        { method: 'POST', body },
      ),
    onSuccess: () => {
      invalidateDispatchNotice(queryClient, avisoId)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dispatchNotices.attempts(avisoId),
      })
    },
  })
}

/** `estado` of a notice Homecenter accepted. */
const DISPATCH_NOTICE_SENT = 'EXITOSO'

/** `POST /api/v1/avisos-despacho/enviar` — stamps the order's real dispatch
 *  date and sends its notice to Homecenter. Not in the backend spec; per the
 *  Postman collection. */
function sendDispatchNotice(
  body: SendDispatchNoticeRequest,
): Promise<SendDispatchNoticeResponse> {
  return apiFetch<SendDispatchNoticeResponse>('/avisos-despacho/enviar', {
    method: 'POST',
    body,
  })
}

/**
 * Dispatches an order via `sendDispatchNotice`. A `200` whose `estado` isn't
 * `EXITOSO`, or that carries `homecenter.isError`, is turned into an error so
 * callers only see success when Homecenter actually accepted the notice.
 */
export function useSendDispatchNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: SendDispatchNoticeRequest) => {
      const result = await sendDispatchNotice(body)
      if (result.estado === DISPATCH_NOTICE_SENT && !result.homecenter.isError)
        return result
      throw new Error(
        result.homecenter.errorMessage ??
          `Homecenter no confirmó el aviso de despacho de la orden ${body.ordenCompra} (estado: ${result.estado}).`,
      )
    },
    // Settled, not success: a rejected send may still have stamped the date.
    onSettled: () => {
      invalidateDispatchNotice(queryClient)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all(),
      })
    },
  })
}
