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
  '15234891': {
    eanPuntoEntrega: '7703670901234',
    direccionEntrega: 'Cra 43A N5-15, Medellín',
    transportadora: 'Logística propia',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '623451',
        producto: 'Estuco plástico 25kg',
        tienda: '7703670901234',
        cantidadSolicitada: 80,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
      {
        sku: '341298',
        producto: 'Lámina drywall 1.20x2.40m',
        tienda: '7703670901234',
        cantidadSolicitada: 45,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
    ],
  },
  '19087345': {
    eanPuntoEntrega: '7703670901456',
    direccionEntrega: 'Cl 84 N50-20, Barranquilla',
    transportadora: 'TCC',
    codigoSesionRecibo: 'REC-2026-0813-01',
    lineas: [
      {
        sku: '789456',
        producto: 'Perfil metálico riel 3m',
        tienda: '7703670901456',
        cantidadSolicitada: 60,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
      {
        sku: '456789',
        producto: 'Tornillo drywall 1" caja x500',
        tienda: '7703670901456',
        cantidadSolicitada: 40,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
    ],
  },
  '20456123': {
    eanPuntoEntrega: '7703670901678',
    direccionEntrega: 'Cra 27 N36-10, Bucaramanga',
    transportadora: 'Coordinadora',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '234567',
        producto: 'Bisagra codo 95° caja x2',
        tienda: '7703670901678',
        cantidadSolicitada: 200,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
    ],
  },
  '18345902': {
    eanPuntoEntrega: '7703670901890',
    direccionEntrega: 'Av. 30 de Agosto N45-12, Pereira',
    transportadora: 'Envía',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '567890',
        producto: 'Cerradura pomo baño',
        tienda: '7703670901890',
        cantidadSolicitada: 50,
        cantidadCancelada: 8,
        estadoLineaTone: 'error',
        estadoLineaLabel: 'Supera solicitado',
      },
    ],
  },
  '16789234': {
    eanPuntoEntrega: '7703670902012',
    direccionEntrega: 'Cl 31 N65-08, Cartagena',
    transportadora: 'Logística propia',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '890123',
        producto: 'Silicona transparente 280ml',
        tienda: '7703670902012',
        cantidadSolicitada: 300,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
      {
        sku: '123789',
        producto: 'Adhesivo para porcelanato 25kg',
        tienda: '7703670902013',
        cantidadSolicitada: 90,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
    ],
  },
  '21098765': {
    eanPuntoEntrega: '7703670902234',
    direccionEntrega: 'Cra 23 N65-30, Manizales',
    transportadora: 'Deprisa',
    codigoSesionRecibo: 'REC-2026-0817-02',
    lineas: [
      {
        sku: '678901',
        producto: 'Boquilla color gris 1kg',
        tienda: '7703670902234',
        cantidadSolicitada: 70,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
    ],
  },
  '17654321': {
    eanPuntoEntrega: '7703670902456',
    direccionEntrega: 'Cl 42 N4-15, Ibagué',
    transportadora: 'Servientrega',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '345678',
        producto: 'Teja termoacústica 3m',
        tienda: '7703670902456',
        cantidadSolicitada: 40,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
      {
        sku: '901234',
        producto: 'Canaleta PVC blanca 3m',
        tienda: '7703670902456',
        cantidadSolicitada: 55,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
    ],
  },
  '19876543': {
    eanPuntoEntrega: '7703670902678',
    direccionEntrega: 'Av. 4 N12-45, Cúcuta',
    transportadora: 'Transportes del Norte',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '456123',
        producto: 'Grifería lavamanos monomando',
        tienda: '7703670902678',
        cantidadSolicitada: 25,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
    ],
  },
  '14567890': {
    eanPuntoEntrega: '7703670902890',
    direccionEntrega: 'Cra 5 N18-22, Neiva',
    transportadora: 'Coordinadora',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '789012',
        producto: 'Sifón universal PVC',
        tienda: '7703670902890',
        cantidadSolicitada: 120,
        cantidadCancelada: 12,
        estadoLineaTone: 'error',
        estadoLineaLabel: 'Supera solicitado',
      },
    ],
  },
  '20123456': {
    eanPuntoEntrega: '7703670903012',
    direccionEntrega: 'Cl 38 N28-10, Villavicencio',
    transportadora: 'TCC',
    codigoSesionRecibo: 'REC-2026-0821-03',
    lineas: [
      {
        sku: '234890',
        producto: 'Manguera jardín 15m',
        tienda: '7703670903012',
        cantidadSolicitada: 65,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
      {
        sku: '567234',
        producto: 'Taladro percutor 1/2"',
        tienda: '7703670903012',
        cantidadSolicitada: 15,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
    ],
  },
  '18765432': {
    eanPuntoEntrega: '7703670903234',
    direccionEntrega: 'Cra 27 N18-40, Pasto',
    transportadora: 'Envía',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '890567',
        producto: 'Disco de corte metal 7"',
        tienda: '7703670903234',
        cantidadSolicitada: 200,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
    ],
  },
  '16543210': {
    eanPuntoEntrega: '7703670903456',
    direccionEntrega: 'Cl 21 N14-30, Armenia',
    transportadora: 'Logística propia',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '123456',
        producto: 'Guantes de carnaza par',
        tienda: '7703670903456',
        cantidadSolicitada: 150,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
      {
        sku: '678345',
        producto: 'Cinta métrica 5m',
        tienda: '7703670903457',
        cantidadSolicitada: 100,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
    ],
  },
  '22345678': {
    eanPuntoEntrega: '7703670903678',
    direccionEntrega: 'Cra 21 N22-15, Santa Marta',
    transportadora: 'Deprisa',
    codigoSesionRecibo: 'REC-2026-0824-04',
    lineas: [
      {
        sku: '345901',
        producto: 'Nivel de burbuja 60cm',
        tienda: '7703670903678',
        cantidadSolicitada: 45,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
    ],
  },
  '19234567': {
    eanPuntoEntrega: '7703670903890',
    direccionEntrega: 'Cl 29 N4-15, Montería',
    transportadora: 'Coordinadora',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '901678',
        producto: 'Extensión eléctrica 10m',
        tienda: '7703670903890',
        cantidadSolicitada: 80,
        cantidadCancelada: 9,
        estadoLineaTone: 'error',
        estadoLineaLabel: 'Supera solicitado',
      },
    ],
  },
  '17890123': {
    eanPuntoEntrega: '7703670904012',
    direccionEntrega: 'Cra 9 N4-30, Popayán',
    transportadora: 'Servientrega',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '456012',
        producto: 'Bombillo LED 9W',
        tienda: '7703670904012',
        cantidadSolicitada: 300,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
      {
        sku: '789345',
        producto: 'Interruptor sencillo',
        tienda: '7703670904013',
        cantidadSolicitada: 180,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
    ],
  },
  '20987654': {
    eanPuntoEntrega: '7703670904234',
    direccionEntrega: 'Cl 16 N19-08, Valledupar',
    transportadora: 'Transportes del Norte',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '234678',
        producto: 'Toma doble con tierra',
        tienda: '7703670904234',
        cantidadSolicitada: 220,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
    ],
  },
  '15678901': {
    eanPuntoEntrega: '7703670904456',
    direccionEntrega: 'Cra 20 N18-15, Sincelejo',
    transportadora: 'TCC',
    codigoSesionRecibo: 'REC-2026-0828-05',
    lineas: [
      {
        sku: '478618',
        producto: 'Piso cerámica Calama 51x51',
        tienda: '7703670904456',
        cantidadSolicitada: 60,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
      {
        sku: '297474',
        producto: 'Pared Salma plana beige 25x35',
        tienda: '7703670904456',
        cantidadSolicitada: 60,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
    ],
  },
  '21456789': {
    eanPuntoEntrega: '7703670904678',
    direccionEntrega: 'Cl 30 N28-12, Palmira',
    transportadora: 'Coordinadora',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '531207',
        producto: 'Malla eslabonada 1.8x10m',
        tienda: '7703670904678',
        cantidadSolicitada: 30,
        cantidadCancelada: 0,
        estadoLineaTone: 'processing',
        estadoLineaLabel: 'Procesando',
      },
    ],
  },
  '18901234': {
    eanPuntoEntrega: '7703670904890',
    direccionEntrega: 'Cra 7 N18-20, Soacha',
    transportadora: 'Logística propia',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '112984',
        producto: 'Cemento gris 50kg',
        tienda: '7703670904890',
        cantidadSolicitada: 400,
        cantidadCancelada: 0,
        estadoLineaTone: 'pending',
        estadoLineaLabel: 'Pendiente',
      },
    ],
  },
  '16234567': {
    eanPuntoEntrega: '7703670905012',
    direccionEntrega: 'Cl 37 Sur N42-10, Envigado',
    transportadora: 'Envía',
    codigoSesionRecibo: '— (sin recibir aún)',
    lineas: [
      {
        sku: '774021',
        producto: 'Tubería PVC 3" x 6m',
        tienda: '7703670905012',
        cantidadSolicitada: 250,
        cantidadCancelada: 30,
        estadoLineaTone: 'error',
        estadoLineaLabel: 'Supera solicitado',
      },
    ],
  },
  '19543210': {
    eanPuntoEntrega: '7703670905234',
    direccionEntrega: 'Cra 10 N15-25, Girardot',
    transportadora: 'Deprisa',
    codigoSesionRecibo: 'REC-2026-0901-06',
    lineas: [
      {
        sku: '905112',
        producto: 'Pintura vinilo blanco 5gal',
        tienda: '7703670905234',
        cantidadSolicitada: 90,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
      {
        sku: '905113',
        producto: 'Rodillo antigota 9"',
        tienda: '7703670905234',
        cantidadSolicitada: 60,
        cantidadCancelada: 0,
        estadoLineaTone: 'dispatched',
        estadoLineaLabel: 'Despachado',
      },
    ],
  },
}

export const getPurchaseOrderDetail = (
  orderId: string,
): PurchaseOrderDetail | undefined => MOCK_PURCHASE_ORDER_DETAILS[orderId]
