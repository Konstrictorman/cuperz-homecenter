// Avisos de Despacho — TanStack Query layer (§ 2 de la especificación).

import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { apiFetch, buildQuery } from './http'
import { queryKeys } from './query-keys'
import type {
  AvisoDespachoDetalle,
  AvisoDespachoResultado,
  AvisoDespachoResumen,
  AvisoEan128Response,
  AvisoIntentosResponse,
  AvisosDespachoQuery,
  CrearAvisoDespachoRequest,
  Paginated,
  ReenviarAvisoRequest,
} from './types'

export function avisosListQueryOptions(query: AvisosDespachoQuery = {}) {
  return queryOptions({
    queryKey: queryKeys.avisos.list(query),
    queryFn: ({ signal }) =>
      apiFetch<Paginated<AvisoDespachoResumen>>(
        `/avisos-despacho${buildQuery({ ...query })}`,
        { signal },
      ),
  })
}

export function avisoDetalleQueryOptions(avisoId: string) {
  return queryOptions({
    queryKey: queryKeys.avisos.detail(avisoId),
    queryFn: ({ signal }) =>
      apiFetch<AvisoDespachoDetalle>(
        `/avisos-despacho/${encodeURIComponent(avisoId)}`,
        { signal },
      ),
    enabled: avisoId.length > 0,
  })
}

/** `GET /api/v1/avisos-despacho/{avisoId}/ean128` (§ 2.4). */
export function avisoEan128QueryOptions(avisoId: string) {
  return queryOptions({
    queryKey: queryKeys.avisos.ean128(avisoId),
    queryFn: ({ signal }) =>
      apiFetch<AvisoEan128Response>(
        `/avisos-despacho/${encodeURIComponent(avisoId)}/ean128`,
        { signal },
      ),
    enabled: avisoId.length > 0,
  })
}

/** `GET /api/v1/avisos-despacho/{avisoId}/intentos` (§ 2.6). */
export function avisoIntentosQueryOptions(avisoId: string) {
  return queryOptions({
    queryKey: queryKeys.avisos.intentos(avisoId),
    queryFn: ({ signal }) =>
      apiFetch<AvisoIntentosResponse>(
        `/avisos-despacho/${encodeURIComponent(avisoId)}/intentos`,
        { signal },
      ),
    enabled: avisoId.length > 0,
  })
}

function invalidateAviso(
  queryClient: ReturnType<typeof useQueryClient>,
  avisoId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.avisos.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.bitacora.all() })
  if (avisoId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.avisos.detail(avisoId),
    })
  }
}

/** `POST /api/v1/avisos-despacho` (§ 2.1) — crea borrador o envía. */
export function useCrearAvisoDespacho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CrearAvisoDespachoRequest) =>
      apiFetch<AvisoDespachoResultado>('/avisos-despacho', {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => invalidateAviso(queryClient, data.avisoId),
  })
}

/** `POST /api/v1/avisos-despacho/{avisoId}/reenviar` (§ 2.5). */
export function useReenviarAvisoDespacho(avisoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ReenviarAvisoRequest) =>
      apiFetch<AvisoDespachoResultado>(
        `/avisos-despacho/${encodeURIComponent(avisoId)}/reenviar`,
        { method: 'POST', body },
      ),
    onSuccess: () => {
      invalidateAviso(queryClient, avisoId)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.avisos.intentos(avisoId),
      })
    },
  })
}
