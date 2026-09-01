// Stands in for GetOrdenDetalle until the Homecenter integration backend
// exists (see CLAUDE.md's "Domain model reference" / hc_orden_detalle).
import type { StatusBadgeTone } from '#/components/statusBadge/StatusBadge'

export interface PurchaseOrderLine {
  sku: string
  producto: string
  tienda: string
  cantidadSolicitada: number
  cantidadCancelada: number
  estadoLineaTone: StatusBadgeTone
  estadoLineaLabel: string
}

export interface PurchaseOrderDetail {
  eanPuntoEntrega: string
  direccionEntrega: string
  transportadora: string
  codigoSesionRecibo: string
  lineas: PurchaseOrderLine[]
}

const MOCK_PURCHASE_ORDER_DETAILS: Record<string, PurchaseOrderDetail> = {
  '8467343': {
    eanPuntoEntrega: '7703670529804',
    direccionEntrega: 'Cra 12 N27-31, Cali',
    transportadora: 'Logística propia',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '478618',
        producto: 'Piso cerámica Calama 51x51',
        tienda: '7703670900306',
        cantidadSolicitada: 30,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
      {
        sku: '297474',
        producto: 'Pared Salma plana beige 25x35',
        tienda: '7703670900306',
        cantidadSolicitada: 30,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
    ],
  },
  '17302836': {
    eanPuntoEntrega: '7703670900580',
    direccionEntrega: 'Cl 80 N9-51, Bogotá',
    transportadora: 'Transportes del Norte',
    codigoSesionRecibo: 'REC-2026-0820-04',
    lineas: [
      {
        sku: '531207',
        producto: 'Malla eslabonada 1.8x10m',
        tienda: '7703670900580',
        cantidadSolicitada: 20,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
      {
        sku: '112984',
        producto: 'Cemento gris 50kg',
        tienda: '7703670900580',
        cantidadSolicitada: 19,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
    ],
  },
  '12174949': {
    eanPuntoEntrega: '7703670900740',
    direccionEntrega: 'Cra 9 N19-22, Tunja',
    transportadora: 'Logística propia',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '774021',
        producto: 'Tubería PVC 3" x 6m',
        tienda: '7703670900740',
        cantidadSolicitada: 300,
        cantidadCancelada: 17,
        estadoLineaTone: 'error',
        estadoLineaLabel: 'Supera solicitado',
      },
    ],
  },
  '12175804': {
    eanPuntoEntrega: '7703670901005',
    direccionEntrega: 'Av. Boyacá N12-45, Bogotá',
    transportadora: 'Coordinadora',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '905112',
        producto: 'Pintura vinilo blanco 5gal',
        tienda: '7703670901005',
        cantidadSolicitada: 150,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
      {
        sku: '905113',
        producto: 'Rodillo antigota 9"',
        tienda: '7703670901005',
        cantidadSolicitada: 100,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
    ],
  },
}

export const getPurchaseOrderDetail = (
  orderId: string,
): PurchaseOrderDetail | undefined => MOCK_PURCHASE_ORDER_DETAILS[orderId]
