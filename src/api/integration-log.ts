// Integration Log — TanStack Query layer (spec § 3).

import { queryOptions } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './http'
import { queryKeys } from './query-keys'
import type {
  IntegrationLogDetail,
  IntegrationLogQuery,
  IntegrationLogSummary,
  Paginated,
} from './types'

export function integrationLogListQueryOptions(
  query: IntegrationLogQuery = {},
) {
  return queryOptions({
    queryKey: queryKeys.integrationLog.list(query),
    queryFn: ({ signal }) =>
      apiFetch<Paginated<IntegrationLogSummary>>(
        `/integracion-log${buildQuery({ ...query })}`,
        { signal },
      ),
  })
}

export function integrationLogDetailQueryOptions(integracionLogId: string) {
  return queryOptions({
    queryKey: queryKeys.integrationLog.detail(integracionLogId),
    queryFn: ({ signal }) =>
      apiFetch<IntegrationLogDetail>(
        `/integracion-log/${encodeURIComponent(integracionLogId)}`,
        { signal },
      ),
    enabled: integracionLogId.length > 0,
  })
}
