// Bitácora de Integración — TanStack Query layer (§ 3 de la especificación).

import { queryOptions } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './http'
import { queryKeys } from './query-keys'
import type {
  IntegracionLogDetalle,
  IntegracionLogQuery,
  IntegracionLogResumen,
  Paginated,
} from './types'

export function bitacoraListQueryOptions(query: IntegracionLogQuery = {}) {
  return queryOptions({
    queryKey: queryKeys.bitacora.list(query),
    queryFn: ({ signal }) =>
      apiFetch<Paginated<IntegracionLogResumen>>(
        `/integracion-log${buildQuery({ ...query })}`,
        { signal },
      ),
  })
}

export function bitacoraDetalleQueryOptions(integracionLogId: string) {
  return queryOptions({
    queryKey: queryKeys.bitacora.detail(integracionLogId),
    queryFn: ({ signal }) =>
      apiFetch<IntegracionLogDetalle>(
        `/integracion-log/${encodeURIComponent(integracionLogId)}`,
        { signal },
      ),
    enabled: integracionLogId.length > 0,
  })
}
