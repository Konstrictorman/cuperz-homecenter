// Centralised TanStack Query keys so invalidation stays consistent.

import type {
  DispatchNoticesQuery,
  IntegrationLogQuery,
  PurchaseOrdersQuery,
} from './types'

export const queryKeys = {
  purchaseOrders: {
    all: () => ['purchase-orders'] as const,
    list: (query: PurchaseOrdersQuery) =>
      ['purchase-orders', 'list', query] as const,
    detail: (ordenCompra: string) =>
      ['purchase-orders', 'detail', ordenCompra] as const,
  },
  dispatchNotices: {
    all: () => ['dispatch-notices'] as const,
    list: (query: DispatchNoticesQuery) =>
      ['dispatch-notices', 'list', query] as const,
    detail: (avisoId: string) =>
      ['dispatch-notices', 'detail', avisoId] as const,
    ean128: (avisoId: string) =>
      ['dispatch-notices', 'ean128', avisoId] as const,
    attempts: (avisoId: string) =>
      ['dispatch-notices', 'attempts', avisoId] as const,
  },
  integrationLog: {
    all: () => ['integration-log'] as const,
    list: (query: IntegrationLogQuery) =>
      ['integration-log', 'list', query] as const,
    detail: (integracionLogId: string) =>
      ['integration-log', 'detail', integracionLogId] as const,
  },
} as const
