// Stands in for GetOrdenesDeCompra until the Homecenter integration backend

import type { PurchaseOrder } from './PurchaseOrdersTable'

// exists (see CLAUDE.md's "Domain model reference" / hc_orden_compra).
export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: '8467343',
    ordenCompra: '8467343',
    cliente: 'Cali Sur',
    ciudadEntrega: 'Cali',
    tiendas: 2,
    cantidadTotal: 60,
    estadoTone: 'pending',
    estadoLabel: 'Pendiente',
    fecha: '2026-08-18',
  },
  {
    id: '17302836',
    ordenCompra: '17302836',
    cliente: 'Bogotá Norte',
    ciudadEntrega: 'Bogotá',
    tiendas: 2,
    cantidadTotal: 39,
    estadoTone: 'dispatched',
    estadoLabel: 'Despachado',
    fecha: '2026-08-20',
  },
  {
    id: '12174949',
    ordenCompra: '12174949',
    cliente: 'Bloque Cero S.A.S.',
    ciudadEntrega: 'Tunja',
    tiendas: 1,
    cantidadTotal: 317,
    estadoTone: 'error',
    estadoLabel: 'Error',
    fecha: '2026-08-22',
  },
  {
    id: '12175804',
    ordenCompra: '12175804',
    cliente: 'Bogotá D.C.',
    ciudadEntrega: 'Bogotá',
    tiendas: 1,
    cantidadTotal: 250,
    estadoTone: 'processing',
    estadoLabel: 'Procesando',
    fecha: '2026-08-25',
  },
]
