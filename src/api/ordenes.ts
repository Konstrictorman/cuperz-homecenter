// Órdenes de Compra — TanStack Query layer (§ 1 de la especificación).

import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { apiFetch, buildQuery } from './http'
import { queryKeys } from './query-keys'
import type {
  OrdenCompraDetalle,
  OrdenesCompraQuery,
  OrdenCompraResumen,
  Paginated,
  ReinyectarOrdenResponse,
  SincronizarOrdenesRequest,
  SincronizarOrdenesResponse,
} from './types'

export function ordenesListQueryOptions(query: OrdenesCompraQuery = {}) {
  return queryOptions({
    queryKey: queryKeys.ordenes.list(query),
    queryFn: ({ signal }) =>
      apiFetch<Paginated<OrdenCompraResumen>>(
        `/ordenes-compra${buildQuery({ ...query })}`,
        { signal },
      ),
  })
}

export function ordenDetalleQueryOptions(ordenCompra: string) {
  return queryOptions({
    queryKey: queryKeys.ordenes.detail(ordenCompra),
    queryFn: ({ signal }) =>
      apiFetch<OrdenCompraDetalle>(
        `/ordenes-compra/${encodeURIComponent(ordenCompra)}`,
        { signal },
      ),
    enabled: ordenCompra.length > 0,
  })
}

/** `POST /api/v1/ordenes-compra/sincronizar` (§ 1.3) — 202, async. */
export function useSincronizarOrdenes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SincronizarOrdenesRequest) =>
      apiFetch<SincronizarOrdenesResponse>('/ordenes-compra/sincronizar', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.bitacora.all() })
    },
  })
}

/** `POST /api/v1/ordenes-compra/{ordenCompra}/reinyectar` (§ 1.4). */
export function useReinyectarOrden() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ordenCompra: string) =>
      apiFetch<ReinyectarOrdenResponse>(
        `/ordenes-compra/${encodeURIComponent(ordenCompra)}/reinyectar`,
        { method: 'POST' },
      ),
    onSuccess: (_data, ordenCompra) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ordenes.detail(ordenCompra),
      })
    },
  })
}

/** `GET /api/v1/ordenes-compra/export` (§ 1.5) — devuelve CSV como texto. */
export function fetchOrdenesExport(
  query: OrdenesCompraQuery = {},
): Promise<string> {
  return apiFetch<string>(`/ordenes-compra/export${buildQuery({ ...query })}`)
}
