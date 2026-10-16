// Dispatch Notices — TanStack Query layer (spec § 2).

import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { todayIsoDate } from '#/common/util'
import { apiFetch, buildQuery } from './http'
import { updatePurchaseOrder } from './purchase-orders'
import { queryKeys } from './query-keys'
import type {
  DispatchNoticeDetail,
  DispatchNoticeResult,
  DispatchNoticeSummary,
  DispatchNoticeEan128Response,
  DispatchNoticeAttemptsResponse,
  DispatchNoticesQuery,
  DispatchPreviewStatus,
  DispatchPreviewsByDateQuery,
  DispatchPreviewsByDateResponse,
  CreateDispatchNoticeRequest,
  Paginated,
  ResendDispatchNoticeRequest,
  SendDispatchNoticeResponse,
} from './types'

export function dispatchNoticesListQueryOptions(
  query: DispatchNoticesQuery = {},
) {
  return queryOptions({
    queryKey: queryKeys.dispatchNotices.list(query),
    queryFn: ({ signal }) =>
      apiFetch<Paginated<DispatchNoticeSummary>>(
        `/avisos-despacho${buildQuery({ ...query })}`,
        { signal },
      ),
  })
}

/** `GET /api/v1/avisos-despacho/por-fecha` — one Orden→Tienda→Contenedor→
 *  Producto tree per PO, ready to drop into an AvisoDespacho payload. Not in
 *  the backend spec; see the type's doc comment in `./types`. */
export function dispatchPreviewsByDateQueryOptions(
  query: DispatchPreviewsByDateQuery = {},
) {
  return queryOptions({
    queryKey: queryKeys.dispatchNotices.previewsByDate(query),
    queryFn: ({ signal }) =>
      apiFetch<DispatchPreviewsByDateResponse>(
        `/avisos-despacho/por-fecha${buildQuery({ ...query })}`,
        { signal },
      ),
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

/** `estado` of a successfully sent notice — the order it belongs to is
 *  then `DESPACHADO` (see `SEND_STATUS_TO_DISPATCH_STATUS`). */
export const DISPATCH_NOTICE_SENT = 'ENVIADO'

/** A sent notice's `estado` → its order's `por-fecha` dispatch status. */
export const SEND_STATUS_TO_DISPATCH_STATUS: Partial<
  Record<string, DispatchPreviewStatus>
> = {
  [DISPATCH_NOTICE_SENT]: 'DESPACHADO',
}

/** `POST /api/v1/avisos-despacho/{avisoId}/enviar` — sends the notice to
 *  Homecenter. Not in the backend spec; per the Postman collection. */
export function sendDispatchNotice(
  avisoId: string,
): Promise<SendDispatchNoticeResponse> {
  return apiFetch<SendDispatchNoticeResponse>(
    `/avisos-despacho/${encodeURIComponent(avisoId)}/enviar`,
    { method: 'POST' },
  )
}

export interface SendOrderDispatchNoticeVariables {
  ordenCompra: string
  /** The order's dispatch date before this send — restored if it fails. */
  previousFechaDespacho: string | null
}

/**
 * Dispatches an order: stamps today as its real dispatch date
 * (`PATCH /ordenes-compra/{ordenCompra}`), then sends its notice to
 * Homecenter (`POST /avisos-despacho/{ordenCompra}/enviar` — the backend keys
 * the notice by the order number).
 *
 * The backend has no single endpoint covering both, so atomicity is
 * best-effort from here: if the send fails (HTTP error, or a `200` whose
 * `estado` isn't `ENVIADO` — i.e. the order isn't `DESPACHADO` — or carries
 * `homecenter.isError`), the order update is rolled back before the error is
 * rethrown. If the rollback itself fails, the thrown error says so — the
 * order is then left dated but without a sent notice.
 */
export function useSendOrderDispatchNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      ordenCompra,
      previousFechaDespacho,
    }: SendOrderDispatchNoticeVariables) => {
      await updatePurchaseOrder(ordenCompra, {
        estado: 'ALISTADO',
        fechaDespacho: todayIsoDate(),
      })

      let sendError: unknown
      try {
        const result = await sendDispatchNotice(ordenCompra)
        const dispatched =
          SEND_STATUS_TO_DISPATCH_STATUS[result.estado] === 'DESPACHADO'
        if (dispatched && !result.homecenter.isError) return result
        sendError = new Error(
          result.homecenter.errorMessage ??
            `Homecenter no confirmó el aviso de despacho de la orden ${ordenCompra} (estado: ${result.estado}).`,
        )
      } catch (error) {
        sendError = error
      }

      try {
        await updatePurchaseOrder(ordenCompra, {
          estado: 'ALISTADO',
          fechaDespacho: previousFechaDespacho,
        })
      } catch {
        throw new Error(
          `No se pudo enviar el aviso de despacho de la orden ${ordenCompra} y tampoco revertir su fecha de despacho. Revisa la orden antes de reintentar.`,
        )
      }
      throw sendError
    },
    // Settled, not success: a failed send may still have changed the order
    // if its rollback failed too.
    onSettled: () => {
      invalidateDispatchNotice(queryClient)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all(),
      })
    },
  })
}
