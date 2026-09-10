// DTOs for the platform's own backend API (`/api/v1`).
// Source: docs/especificacion-endpoints-backend (2).md
//
// One type per request-param object and response body, grouped by process.

// ===========================================================================
// General conventions
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
// Process 1 — Purchase Orders (Homecenter → Platform) · § 1
// ===========================================================================

export type OrderStatus =
  'PENDIENTE' | 'DESPACHADA' | 'CON_ERROR' | 'PROCESANDO'

export type OrderLineStatus =
  'PENDIENTE' | 'DESPACHADA' | 'PARCIAL' | 'CANCELADA' | 'SUPERA_SOLICITADO'

/** Row shape for `GET /api/v1/ordenes-compra` (§ 1.1). */
export interface PurchaseOrderSummary {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  ciudadEntrega: string
  cantidadTiendas: number
  cantidadTotalSolicitada: number
  estado: OrderStatus
  fechaOrden: IsoDate
  ultimaActualizacion: IsoDateTime
}

export interface PurchaseOrderLineItem {
  eanSku: string
  descripcion: string
  cantidadSolicitada: number
  cantidadCancelada: number
  cantidadDevuelta: number
  estadoLinea: OrderLineStatus
}

export interface PurchaseOrderStore {
  eanTienda: string
  productos: Array<PurchaseOrderLineItem>
}

/** Full shape for `GET /api/v1/ordenes-compra/{ordenCompra}` (§ 1.2). */
export interface PurchaseOrderDetail {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  direccionEntrega: string
  estado: OrderStatus
  codigoSesionRecibo: string | null
  tiendas: Array<PurchaseOrderStore>
}

/** Query params for `GET /api/v1/ordenes-compra` and `.../export` (§ 1.1, § 1.5). */
export interface PurchaseOrdersQuery extends PaginationQuery {
  /** Partial/exact match on the PO number. */
  ordenCompra?: string
  estado?: OrderStatus
  fechaDesde?: IsoDate
  fechaHasta?: IsoDate
  /** Store EAN. */
  tienda?: string
}

export type SyncMode = 'INCREMENTAL' | 'COMPLETA'

/** Body for `POST /api/v1/ordenes-compra/sincronizar` (§ 1.3). */
export interface SyncPurchaseOrdersRequest {
  modo: SyncMode
}

/** `202` response for § 1.3 — the sync runs asynchronously. */
export interface SyncPurchaseOrdersResponse {
  sincronizacionId: string
  estado: 'EN_PROCESO'
}

/** `200` response for `POST /api/v1/ordenes-compra/{ordenCompra}/reinyectar` (§ 1.4). */
export interface ReprocessOrderResponse {
  ordenCompra: string
  estado: 'PROCESANDO'
  intentoNumero: number
}

// ===========================================================================
// Process 2 — Dispatch Notices (Platform → Homecenter) · § 2
// ===========================================================================

export type DispatchNoticeStatus =
  'BORRADOR' | 'ENVIADO' | 'CON_NOVEDAD' | 'ERROR_ENVIO'

// --- Hierarchy Order → Store → Container → Product (request payload) ---

export interface DispatchNoticeProductInput {
  eanSku: string
  cantidad: number
  /** Required per product. */
  peso: number
  /** Required per product. */
  volumen: number
}

export interface DispatchNoticeContainerInput {
  /** Alphanumeric / consecutive code, e.g. `CONT001`. */
  contenedor: string
  productos: Array<DispatchNoticeProductInput>
}

export interface DispatchNoticeStoreInput {
  eanTienda: string
  contenedores: Array<DispatchNoticeContainerInput>
}

/** Body for `POST /api/v1/avisos-despacho` (§ 2.1). */
export interface CreateDispatchNoticeRequest {
  ordenCompra: string
  fechaRealDespacho: IsoDate
  /** `false` saves a draft without calling Homecenter. */
  enviarInmediatamente: boolean
  tiendas: Array<DispatchNoticeStoreInput>
}

// --- Homecenter's response, as interpreted by the backend ---

export interface HomecenterIssueItem {
  eanSku: string
  eanTienda: string
  mensaje: string
}

/**
 * Homecenter's raw verdict. `isError: false` + `errorMessage != null` is the
 * ambiguous "accepted the call but reported problems" case → `CON_NOVEDAD`.
 */
export interface HomecenterResult {
  isError: boolean
  errorMessage: string | null
  detalle?: Array<HomecenterIssueItem>
}

/** `201`/`200` response for § 2.1 and § 2.5. */
export interface DispatchNoticeResult {
  avisoId: string
  ordenCompra: string
  estado: DispatchNoticeStatus
  homecenter: HomecenterResult
  /** Present on resend (§ 2.5) and detail (§ 2.3). */
  intentos?: number
}

/** Row shape for `GET /api/v1/avisos-despacho` (§ 2.2). */
export interface DispatchNoticeSummary {
  avisoId: string
  ordenCompra: string
  fechaRealDespacho: IsoDate
  cantidadContenedores: number
  estado: DispatchNoticeStatus
  fechaEnvio: IsoDateTime | null
}

/** Full shape for `GET /api/v1/avisos-despacho/{avisoId}` (§ 2.3). */
export interface DispatchNoticeDetail {
  avisoId: string
  ordenCompra: string
  fechaRealDespacho: IsoDate
  enviarInmediatamente: boolean
  tiendas: Array<DispatchNoticeStoreInput>
  estado: DispatchNoticeStatus
  intentos: number
  /** Reference to the most recent audit-log entry for this notice. */
  integracionLogId: string | null
}

/** Query params for `GET /api/v1/avisos-despacho` (§ 2.2). */
export interface DispatchNoticesQuery extends PaginationQuery {
  ordenCompra?: string
  estado?: DispatchNoticeStatus
  fechaDesde?: IsoDate
  fechaHasta?: IsoDate
}

// --- EAN128 (§ 2.4) ---

export interface Ean128Container {
  contenedor: string
  eanSku: string
  cantidadSolicitada: number
  cantidadDespachada: number
  peso: number
  volumen: number
  ean128: string
}

/** `200` response for `GET /api/v1/avisos-despacho/{avisoId}/ean128` (§ 2.4). */
export interface DispatchNoticeEan128Response {
  avisoId: string
  contenedores: Array<Ean128Container>
}

// --- Resend (§ 2.5) ---

export interface DispatchNoticeCorrection {
  eanSku: string
  eanTienda: string
  contenedor: string
  cantidadCorregida: number
}

/** Body for `POST /api/v1/avisos-despacho/{avisoId}/reenviar` (§ 2.5). */
export interface ResendDispatchNoticeRequest {
  correcciones: Array<DispatchNoticeCorrection>
}

// --- Attempt history (§ 2.6) ---

export interface DispatchNoticeAttempt {
  numero: number
  fecha: IsoDateTime
  estado: DispatchNoticeStatus
  integracionLogId: string
}

/** `200` response for `GET /api/v1/avisos-despacho/{avisoId}/intentos` (§ 2.6). */
export interface DispatchNoticeAttemptsResponse {
  avisoId: string
  intentos: Array<DispatchNoticeAttempt>
}

// ===========================================================================
// Integration Log (shared across all 3 processes) · § 3
// ===========================================================================

export type IntegrationLogType =
  'ORDEN_COMPRA_SYNC' | 'AVISO_DESPACHO' | 'AVISO_RECIBO'

export type IntegrationLogStatus = 'EXITOSO' | 'CON_NOVEDAD' | 'FALLIDO'

/** Row shape for `GET /api/v1/integracion-log` (§ 3.2). */
export interface IntegrationLogSummary {
  integracionLogId: string
  tipo: IntegrationLogType
  fecha: IsoDateTime
  estado: IntegrationLogStatus
  /** Points at the `avisoId` or `ordenCompra`, depending on `tipo`. */
  referencia: string
}

/** Full shape for `GET /api/v1/integracion-log/{integracionLogId}` (§ 3.1). */
export interface IntegrationLogDetail {
  integracionLogId: string
  tipo: IntegrationLogType
  fecha: IsoDateTime
  estado: IntegrationLogStatus
  referencia: string
  /** Exact payload sent to Homecenter. */
  requestEnviado: unknown
  /** Exact payload received from Homecenter. */
  respuestaRecibida: unknown
}

/** Query params for `GET /api/v1/integracion-log` (§ 3.2). */
export interface IntegrationLogQuery extends PaginationQuery {
  tipo?: IntegrationLogType
  estado?: IntegrationLogStatus
  fechaDesde?: string
  fechaHasta?: string
}
