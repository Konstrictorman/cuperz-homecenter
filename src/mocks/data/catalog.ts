// Reference catalogue the mock generators draw from. Store EANs are the real
// Sodimac / Homecenter values seen in docs/ORD_15669499 (1).csv; product SKUs
// mirror the shape used in the wireframe mocks.

export interface StoreCatalogEntry {
  eanTienda: string
  nombre: string
  ciudad: string
}

export interface DeliveryPointCatalogEntry {
  ean: string
  nombre: string
  ciudad: string
  direccion: string
}

export interface ProductCatalogEntry {
  eanSku: string
  /** Homecenter's own internal product code (raw `SKU`), distinct from eanSku. */
  skuHomecenter: string
  descripcion: string
  /** Raw `COSTO_SKU`. */
  costoUnitario: number
}

export const DELIVERY_POINTS: Array<DeliveryPointCatalogEntry> = [
  {
    ean: '7703670529804',
    nombre: 'SODIMAC - CEDI FUNZA',
    ciudad: 'Funza',
    direccion: 'Autopista Medellín Km 1.5, Funza',
  },
  {
    ean: '7703670529811',
    nombre: 'SODIMAC - CEDI GIRARDOTA',
    ciudad: 'Girardota',
    direccion: 'Vía Girardota - Barbosa Km 2, Girardota',
  },
  {
    ean: '7703670529828',
    nombre: 'SODIMAC - CEDI YUMBO',
    ciudad: 'Yumbo',
    direccion: 'Zona Industrial Acopi, Yumbo',
  },
]

export const STORES: Array<StoreCatalogEntry> = [
  { eanTienda: '7703670900306', nombre: 'SODIMAC - CALI SUR', ciudad: 'Cali' },
  {
    eanTienda: '7703670900405',
    nombre: 'SODIMAC - MEDELLIN INDUSTRIALES',
    ciudad: 'Medellín',
  },
  {
    eanTienda: '7703670900580',
    nombre: 'SODIMAC - BOGOTA AV EL DORADO',
    ciudad: 'Bogotá',
  },
  {
    eanTienda: '7703670900689',
    nombre: 'SODIMAC - BOGOTA CALLE 80',
    ciudad: 'Bogotá',
  },
  {
    eanTienda: '7703670900702',
    nombre: 'SODIMAC - BOGOTA NORTE',
    ciudad: 'Bogotá',
  },
  {
    eanTienda: '7703670900801',
    nombre: 'SODIMAC - BOGOTA SUR',
    ciudad: 'Bogotá',
  },
  {
    eanTienda: '7703670900900',
    nombre: 'SODIMAC - BARRANQUILLA 45',
    ciudad: 'Barranquilla',
  },
  {
    eanTienda: '7703670901006',
    nombre: 'SODIMAC - BUCARAMANGA',
    ciudad: 'Bucaramanga',
  },
  {
    eanTienda: '7703670901105',
    nombre: 'SODIMAC - PEREIRA',
    ciudad: 'Pereira',
  },
  {
    eanTienda: '7703670901204',
    nombre: 'SODIMAC - MANIZALES',
    ciudad: 'Manizales',
  },
  {
    eanTienda: '7703670901303',
    nombre: 'SODIMAC - CARTAGENA',
    ciudad: 'Cartagena',
  },
  { eanTienda: '7703670901402', nombre: 'SODIMAC - IBAGUE', ciudad: 'Ibagué' },
]

export const CLIENTS: Array<string> = [
  'Cali Sur',
  'Bogotá Norte',
  'Bloque Cero S.A.S.',
  'Bogotá D.C.',
  'Medellín Poblado',
  'Barranquilla Norte',
  'Bucaramanga Cabecera',
  'Pereira Centro',
  'Cartagena Bocagrande',
  'Manizales Centro',
]

export const PRODUCTS: Array<ProductCatalogEntry> = [
  {
    eanSku: '7703670004288',
    skuHomecenter: '412001',
    descripcion: 'MALLA ESLABONADA 1.8x10m METAL 2.1/4x2.1/4 2.5 mm',
    costoUnitario: 89000,
  },
  {
    eanSku: '7703670004295',
    skuHomecenter: '412002',
    descripcion: 'PISO CERAMICA CALAMA BEIGE 51x51 CM CAJA x 1.30 M2',
    costoUnitario: 42500,
  },
  {
    eanSku: '7703670004301',
    skuHomecenter: '412003',
    descripcion: 'PARED SALMA PLANA BEIGE 25x35 CM CAJA x 1.50 M2',
    costoUnitario: 38900,
  },
  {
    eanSku: '7703670004318',
    skuHomecenter: '412004',
    descripcion: 'CEMENTO GRIS USO GENERAL 50 KG',
    costoUnitario: 32500,
  },
  {
    eanSku: '7703670004325',
    skuHomecenter: '412005',
    descripcion: 'TUBERIA PVC PRESION 3 PULG x 6 M RDE 21',
    costoUnitario: 76800,
  },
  {
    eanSku: '7703670004332',
    skuHomecenter: '412006',
    descripcion: 'PINTURA VINILO TIPO 1 BLANCO 5 GALONES',
    costoUnitario: 215000,
  },
  {
    eanSku: '7703670004349',
    skuHomecenter: '412007',
    descripcion: 'RODILLO ANTIGOTA FELPA 9 PULG CON MANGO',
    costoUnitario: 18900,
  },
  {
    eanSku: '7703670004356',
    skuHomecenter: '412008',
    descripcion: 'ESTUCO PLASTICO INTERIOR 25 KG',
    costoUnitario: 54200,
  },
  {
    eanSku: '7703670004363',
    skuHomecenter: '412009',
    descripcion: 'LAMINA DRYWALL ESTANDAR 1.22 x 2.44 M x 1/2 PULG',
    costoUnitario: 61500,
  },
  {
    eanSku: '7703670004370',
    skuHomecenter: '412010',
    descripcion: 'PERFIL METALICO PARAL CAL 26 x 3 M',
    costoUnitario: 24800,
  },
  {
    eanSku: '7703670004387',
    skuHomecenter: '412011',
    descripcion: 'TORNILLO DRYWALL PUNTA BROCA 1 PULG CAJA x 500',
    costoUnitario: 45300,
  },
  {
    eanSku: '7703670004394',
    skuHomecenter: '412012',
    descripcion: 'BOMBILLO LED A19 9W LUZ FRIA E27',
    costoUnitario: 9800,
  },
  {
    eanSku: '7703670004400',
    skuHomecenter: '412013',
    descripcion: 'INTERRUPTOR SENCILLO CON PLACA BLANCO',
    costoUnitario: 12400,
  },
  {
    eanSku: '7703670004417',
    skuHomecenter: '412014',
    descripcion: 'SILICONA MULTIUSO TRANSPARENTE 280 ML',
    costoUnitario: 15600,
  },
  {
    eanSku: '7703670004424',
    skuHomecenter: '412015',
    descripcion: 'ADHESIVO PORCELANATO GRIS 25 KG',
    costoUnitario: 48900,
  },
  {
    eanSku: '7703670004431',
    skuHomecenter: '412016',
    descripcion: 'GRIFERIA LAVAMANOS MONOCONTROL CROMO',
    costoUnitario: 132000,
  },
  {
    eanSku: '7703670004448',
    skuHomecenter: '412017',
    descripcion: 'SIFON BOTELLA UNIVERSAL PVC 1.1/4 PULG',
    costoUnitario: 21500,
  },
  {
    eanSku: '7703670004455',
    skuHomecenter: '412018',
    descripcion: 'DISCO CORTE METAL 7 PULG x 1/16 PULG',
    costoUnitario: 8900,
  },
  {
    eanSku: '7703670004462',
    skuHomecenter: '412019',
    descripcion: 'MANGUERA JARDIN REFORZADA 1/2 PULG x 15 M',
    costoUnitario: 67400,
  },
  {
    eanSku: '7703670004479',
    skuHomecenter: '412020',
    descripcion: 'GUANTE CARNAZA REFORZADO TALLA UNICA PAR',
    costoUnitario: 14200,
  },
]

// --- SPEC 00 additions: catalog values for the order-level fields Homecenter
// sends alongside the products/stores above. ---

export const CARRIERS: Array<string> = [
  '7-LOGISTICA PROPIA',
  '3-TRANSPORTES SODIMAC',
  '12-COORDINADORA',
  '5-ENVIA',
]

export const PAYMENT_CONDITIONS: Array<string> = [
  '30 Dias',
  '45 Dias',
  '60 Dias',
  'Contado',
]

export const SALE_UNITS: Array<string> = ['UND', 'CJA', 'M2', 'KG', 'MT']

/** Raw `TIPO_OC` samples. */
export const ORDER_TYPES: Array<string> = [
  '4-Venta Empresa',
  '1-Venta Directa',
  '2-Venta Convenio',
]

/** Raw `TIPO_DE_ORDEN` samples. */
export const ORDER_FULFILLMENT_TYPES: Array<string> = [
  'ENTREGA_DIRECTA',
  'CROSS_DOCKING',
]

/** Raw `TIPO_ENTREGA` samples. */
export const DELIVERY_CHANNELS: Array<string> = ['RETAIL', 'ECOMMERCE']
