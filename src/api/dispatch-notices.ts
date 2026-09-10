// Dispatch Notices — TanStack Query layer (spec § 2).

import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { apiFetch, buildQuery } from './http'
import { queryKeys } from './query-keys'
import type {
  DispatchNoticeDetail,
  DispatchNoticeResult,
  DispatchNoticeSummary,
  DispatchNoticeEan128Response,
  DispatchNoticeAttemptsResponse,
  DispatchNoticesQuery,
  CreateDispatchNoticeRequest,
  Paginated,
  ResendDispatchNoticeRequest,
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
