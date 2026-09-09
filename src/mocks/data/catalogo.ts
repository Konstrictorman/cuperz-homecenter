// Reference catalogue the mock generators draw from. Store EANs are the real
// Sodimac / Homecenter values seen in docs/ORD_15669499 (1).csv; product SKUs
// mirror the shape used in the wireframe mocks.

export interface TiendaCatalogo {
  eanTienda: string
  nombre: string
  ciudad: string
}

export interface PuntoEntregaCatalogo {
  ean: string
  nombre: string
  ciudad: string
  direccion: string
}

export interface ProductoCatalogo {
  eanSku: string
  descripcion: string
}

export const PUNTOS_ENTREGA: Array<PuntoEntregaCatalogo> = [
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

export const TIENDAS: Array<TiendaCatalogo> = [
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

export const CLIENTES: Array<string> = [
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

export const PRODUCTOS: Array<ProductoCatalogo> = [
  {
    eanSku: '7703670004288',
    descripcion: 'MALLA ESLABONADA 1.8x10m METAL 2.1/4x2.1/4 2.5 mm',
  },
  {
    eanSku: '7703670004295',
    descripcion: 'PISO CERAMICA CALAMA BEIGE 51x51 CM CAJA x 1.30 M2',
  },
  {
    eanSku: '7703670004301',
    descripcion: 'PARED SALMA PLANA BEIGE 25x35 CM CAJA x 1.50 M2',
  },
  { eanSku: '7703670004318', descripcion: 'CEMENTO GRIS USO GENERAL 50 KG' },
  {
    eanSku: '7703670004325',
    descripcion: 'TUBERIA PVC PRESION 3 PULG x 6 M RDE 21',
  },
  {
    eanSku: '7703670004332',
    descripcion: 'PINTURA VINILO TIPO 1 BLANCO 5 GALONES',
  },
  {
    eanSku: '7703670004349',
    descripcion: 'RODILLO ANTIGOTA FELPA 9 PULG CON MANGO',
  },
  { eanSku: '7703670004356', descripcion: 'ESTUCO PLASTICO INTERIOR 25 KG' },
  {
    eanSku: '7703670004363',
    descripcion: 'LAMINA DRYWALL ESTANDAR 1.22 x 2.44 M x 1/2 PULG',
  },
  {
    eanSku: '7703670004370',
    descripcion: 'PERFIL METALICO PARAL CAL 26 x 3 M',
  },
  {
    eanSku: '7703670004387',
    descripcion: 'TORNILLO DRYWALL PUNTA BROCA 1 PULG CAJA x 500',
  },
  { eanSku: '7703670004394', descripcion: 'BOMBILLO LED A19 9W LUZ FRIA E27' },
  {
    eanSku: '7703670004400',
    descripcion: 'INTERRUPTOR SENCILLO CON PLACA BLANCO',
  },
  {
    eanSku: '7703670004417',
    descripcion: 'SILICONA MULTIUSO TRANSPARENTE 280 ML',
  },
  { eanSku: '7703670004424', descripcion: 'ADHESIVO PORCELANATO GRIS 25 KG' },
  {
    eanSku: '7703670004431',
    descripcion: 'GRIFERIA LAVAMANOS MONOCONTROL CROMO',
  },
  {
    eanSku: '7703670004448',
    descripcion: 'SIFON BOTELLA UNIVERSAL PVC 1.1/4 PULG',
  },
  {
    eanSku: '7703670004455',
    descripcion: 'DISCO CORTE METAL 7 PULG x 1/16 PULG',
  },
  {
    eanSku: '7703670004462',
    descripcion: 'MANGUERA JARDIN REFORZADA 1/2 PULG x 15 M',
  },
  {
    eanSku: '7703670004479',
    descripcion: 'GUANTE CARNAZA REFORZADO TALLA UNICA PAR',
  },
]
