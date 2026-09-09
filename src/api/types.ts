// DTOs for the platform's own backend API (`/api/v1`).
// Source: docs/especificacion-endpoints-backend (2).md
//
// One type per request-param object and response body, grouped by process.

// ===========================================================================
// Convenciones generales
// ===========================================================================

/** Paging metadata returned inside every list envelope. */
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Standard envelope for every list endpoint. */
export interface Paginated<T> {
  data: Array<T>
  pagination: Pagination
}

/** Standard error body (HTTP 400/401/404/409/502). */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details: Array<unknown>
  }
}

/** Query params shared by every list endpoint. */
export interface PaginationQuery {
  page?: number
  /** Default 20, max 100. */
  pageSize?: number
}

/** ISO-8601 calendar date, `YYYY-MM-DD` (the API's own format). */
export type IsoDate = string

/** ISO-8601 timestamp, `YYYY-MM-DDTHH:mm:ssZ`. */
export type IsoDateTime = string

// ===========================================================================
// Proceso 1 — Órdenes de Compra (Homecenter → Plataforma) · § 1
// ===========================================================================

export type EstadoOrden =
  'PENDIENTE' | 'DESPACHADA' | 'CON_ERROR' | 'PROCESANDO'

export type EstadoLineaOrden =
  'PENDIENTE' | 'DESPACHADA' | 'PARCIAL' | 'CANCELADA' | 'SUPERA_SOLICITADO'

/** Row shape for `GET /api/v1/ordenes-compra` (§ 1.1). */
export interface OrdenCompraResumen {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  ciudadEntrega: string
  cantidadTiendas: number
  cantidadTotalSolicitada: number
  estado: EstadoOrden
  fechaOrden: IsoDate
  ultimaActualizacion: IsoDateTime
}

export interface OrdenCompraProducto {
  eanSku: string
  descripcion: string
  cantidadSolicitada: number
  cantidadCancelada: number
  cantidadDevuelta: number
  estadoLinea: EstadoLineaOrden
}

export interface OrdenCompraTienda {
  eanTienda: string
  productos: Array<OrdenCompraProducto>
}

/** Full shape for `GET /api/v1/ordenes-compra/{ordenCompra}` (§ 1.2). */
export interface OrdenCompraDetalle {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  direccionEntrega: string
  estado: EstadoOrden
  codigoSesionRecibo: string | null
  tiendas: Array<OrdenCompraTienda>
}

/** Query params for `GET /api/v1/ordenes-compra` and `.../export` (§ 1.1, § 1.5). */
export interface OrdenesCompraQuery extends PaginationQuery {
  /** Partial/exact match on the PO number. */
  ordenCompra?: string
  estado?: EstadoOrden
  fechaDesde?: IsoDate
  fechaHasta?: IsoDate
  /** Store EAN. */
  tienda?: string
}

export type SincronizarModo = 'INCREMENTAL' | 'COMPLETA'

/** Body for `POST /api/v1/ordenes-compra/sincronizar` (§ 1.3). */
export interface SincronizarOrdenesRequest {
  modo: SincronizarModo
}

/** `202` response for § 1.3 — the sync runs asynchronously. */
export interface SincronizarOrdenesResponse {
  sincronizacionId: string
  estado: 'EN_PROCESO'
}

/** `200` response for `POST /api/v1/ordenes-compra/{ordenCompra}/reinyectar` (§ 1.4). */
export interface ReinyectarOrdenResponse {
  ordenCompra: string
  estado: 'PROCESANDO'
  intentoNumero: number
}

// ===========================================================================
// Proceso 2 — Avisos de Despacho (Plataforma → Homecenter) · § 2
// ===========================================================================

export type EstadoAviso = 'BORRADOR' | 'ENVIADO' | 'CON_NOVEDAD' | 'ERROR_ENVIO'

// --- Jerarquía Orden → Tienda → Contenedor → Producto (payload de entrada) ---

export interface AvisoProductoInput {
  eanSku: string
  cantidad: number
  /** Required per product. */
  peso: number
  /** Required per product. */
  volumen: number
}

export interface AvisoContenedorInput {
  /** Alphanumeric / consecutive code, e.g. `CONT001`. */
  contenedor: string
  productos: Array<AvisoProductoInput>
}

export interface AvisoTiendaInput {
  eanTienda: string
  contenedores: Array<AvisoContenedorInput>
}

/** Body for `POST /api/v1/avisos-despacho` (§ 2.1). */
export interface CrearAvisoDespachoRequest {
  ordenCompra: string
  fechaRealDespacho: IsoDate
  /** `false` saves a draft without calling Homecenter. */
  enviarInmediatamente: boolean
  tiendas: Array<AvisoTiendaInput>
}

// --- Respuesta de Homecenter, interpretada por el backend ---

export interface HomecenterNovedadItem {
  eanSku: string
  eanTienda: string
  mensaje: string
}

/**
 * Homecenter's raw verdict. `isError: false` + `errorMessage != null` is the
 * ambiguous "aceptó la llamada pero reportó problemas" case → `CON_NOVEDAD`.
 */
export interface HomecenterResultado {
  isError: boolean
  errorMessage: string | null
  detalle?: Array<HomecenterNovedadItem>
}

/** `201`/`200` response for § 2.1 and § 2.5. */
export interface AvisoDespachoResultado {
  avisoId: string
  ordenCompra: string
  estado: EstadoAviso
  homecenter: HomecenterResultado
  /** Present on resend (§ 2.5) and detail (§ 2.3). */
  intentos?: number
}

/** Row shape for `GET /api/v1/avisos-despacho` (§ 2.2). */
export interface AvisoDespachoResumen {
  avisoId: string
  ordenCompra: string
  fechaRealDespacho: IsoDate
  cantidadContenedores: number
  estado: EstadoAviso
  fechaEnvio: IsoDateTime | null
}

/** Full shape for `GET /api/v1/avisos-despacho/{avisoId}` (§ 2.3). */
export interface AvisoDespachoDetalle {
  avisoId: string
  ordenCompra: string
  fechaRealDespacho: IsoDate
  enviarInmediatamente: boolean
  tiendas: Array<AvisoTiendaInput>
  estado: EstadoAviso
  intentos: number
  /** Reference to the most recent audit-log entry for this notice. */
  integracionLogId: string | null
}

/** Query params for `GET /api/v1/avisos-despacho` (§ 2.2). */
export interface AvisosDespachoQuery extends PaginationQuery {
  ordenCompra?: string
  estado?: EstadoAviso
  fechaDesde?: IsoDate
  fechaHasta?: IsoDate
}

// --- EAN128 (§ 2.4) ---

export interface Ean128Contenedor {
  contenedor: string
  eanSku: string
  cantidadSolicitada: number
  cantidadDespachada: number
  peso: number
  volumen: number
  ean128: string
}

/** `200` response for `GET /api/v1/avisos-despacho/{avisoId}/ean128` (§ 2.4). */
export interface AvisoEan128Response {
  avisoId: string
  contenedores: Array<Ean128Contenedor>
}

// --- Reenvío (§ 2.5) ---

export interface CorreccionAviso {
  eanSku: string
  eanTienda: string
  contenedor: string
  cantidadCorregida: number
}

/** Body for `POST /api/v1/avisos-despacho/{avisoId}/reenviar` (§ 2.5). */
export interface ReenviarAvisoRequest {
  correcciones: Array<CorreccionAviso>
}

// --- Historial de intentos (§ 2.6) ---

export interface AvisoIntento {
  numero: number
  fecha: IsoDateTime
  estado: EstadoAviso
  integracionLogId: string
}

/** `200` response for `GET /api/v1/avisos-despacho/{avisoId}/intentos` (§ 2.6). */
export interface AvisoIntentosResponse {
  avisoId: string
  intentos: Array<AvisoIntento>
}

// ===========================================================================
// Bitácora de Integración (transversal a los 3 procesos) · § 3
// ===========================================================================

export type TipoIntegracion =
  'ORDEN_COMPRA_SYNC' | 'AVISO_DESPACHO' | 'AVISO_RECIBO'

export type EstadoIntegracion = 'EXITOSO' | 'CON_NOVEDAD' | 'FALLIDO'

/** Row shape for `GET /api/v1/integracion-log` (§ 3.2). */
export interface IntegracionLogResumen {
  integracionLogId: string
  tipo: TipoIntegracion
  fecha: IsoDateTime
  estado: EstadoIntegracion
  /** Points at the `avisoId` or `ordenCompra`, depending on `tipo`. */
  referencia: string
}

/** Full shape for `GET /api/v1/integracion-log/{integracionLogId}` (§ 3.1). */
export interface IntegracionLogDetalle {
  integracionLogId: string
  tipo: TipoIntegracion
  fecha: IsoDateTime
  estado: EstadoIntegracion
  referencia: string
  /** Exact payload sent to Homecenter. */
  requestEnviado: unknown
  /** Exact payload received from Homecenter. */
  respuestaRecibida: unknown
}

/** Query params for `GET /api/v1/integracion-log` (§ 3.2). */
export interface IntegracionLogQuery extends PaginationQuery {
  tipo?: TipoIntegracion
  estado?: EstadoIntegracion
  fechaDesde?: string
  fechaHasta?: string
}
