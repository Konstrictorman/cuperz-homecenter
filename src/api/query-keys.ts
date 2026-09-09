// Centralised TanStack Query keys so invalidation stays consistent.

import type {
  AvisosDespachoQuery,
  IntegracionLogQuery,
  OrdenesCompraQuery,
} from './types'

export const queryKeys = {
  ordenes: {
    all: () => ['ordenes-compra'] as const,
    list: (query: OrdenesCompraQuery) =>
      ['ordenes-compra', 'list', query] as const,
    detail: (ordenCompra: string) =>
      ['ordenes-compra', 'detail', ordenCompra] as const,
  },
  avisos: {
    all: () => ['avisos-despacho'] as const,
    list: (query: AvisosDespachoQuery) =>
      ['avisos-despacho', 'list', query] as const,
    detail: (avisoId: string) =>
      ['avisos-despacho', 'detail', avisoId] as const,
    ean128: (avisoId: string) =>
      ['avisos-despacho', 'ean128', avisoId] as const,
    intentos: (avisoId: string) =>
      ['avisos-despacho', 'intentos', avisoId] as const,
  },
  bitacora: {
    all: () => ['integracion-log'] as const,
    list: (query: IntegracionLogQuery) =>
      ['integracion-log', 'list', query] as const,
    detail: (integracionLogId: string) =>
      ['integracion-log', 'detail', integracionLogId] as const,
  },
} as const
