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
  costoTotalOc: number
  estado: OrderStatus
  /** Raw `FECHA_TRANSMISION`. */
  fechaTransmision: IsoDate
  ultimaActualizacion: IsoDateTime
  /** Platform-only flag (not part of Homecenter's contract) — `true` once
   *  the order is more than 3 months past its `fechaTransmision`, i.e. it
   *  belongs to the archive rather than the day-to-day listing. Age-derived,
   *  not user-toggled — see `incluirHistorial` on `PurchaseOrdersQuery`. */
  archivada: boolean
  /** Platform-only field (not part of Homecenter's contract) — distinct from
   *  `PurchaseOrderDetail.notaPedido` (raw `NOTA_PEDIDO`). `null` when unset. */
  numPedido: string | null
  /** Raw `FECHA_MIN_ENTREGA`, normalised — see `PurchaseOrderDetail.fechaMinEntrega`. */
  fechaMinEntrega: IsoDateTime | null
  /** Raw `FECHA_MAX_ENTREGA`, normalised — see `PurchaseOrderDetail.fechaMaxEntrega`. */
  fechaMaxEntrega: IsoDateTime | null
}

/** Per-store product line within a `PurchaseOrderDetail`. Homecenter's raw
 *  `GetOrdenesDeCompra` response nests the other way around
 *  (`productos[].tiendas[]`) — the backend inverts that into
 *  `tiendas[].productos[]` before responding, because the platform's screens
 *  (starting with the purchase-order detail table, grouped/expandable by
 *  store) consume it store-first. The frontend never sees Homecenter's raw
 *  shape. */
export interface PurchaseOrderStoreLine {
  eanSku: string
  /** Homecenter's own internal product code (raw `SKU`), distinct from eanSku. */
  skuHomecenter: string
  descripcion: string
  /** Quantity requested for this SKU specifically at this store. */
  cantidad: number
  /** Raw line total requested for this SKU across every store on the order —
   *  the same value repeats on each store's entry for the SKU; it is not
   *  store-specific (see `cantidad`). */
  cantidadSolicitada: number
  cantidadCancelada: number
  cantidadDevuelta: number
  estadoLinea: OrderLineStatus
  /** Raw `COSTO_SKU`. */
  costoUnitario: number
  /** Raw `CONDICION_PAGO`, trimmed. */
  condicionPago: string
  /** Raw `DESCUENTO_SKU`. */
  descuentoSku: number
  /** Raw `UNIDAD_VENTA`, trimmed. */
  unidadVenta: string
}

/** A store within a `PurchaseOrderDetail`, with the products allocated to it. */
export interface PurchaseOrderStore {
  eanTienda: string
  nombreTienda: string
  productos: Array<PurchaseOrderStoreLine>
}

export interface PurchaseOrderBillingAddress {
  barrio: string
  ciudad: string
  departamento: string
  direccion: string
}

/** Raw `NEGOCIACION`/`*_VE`/`NIT_CONSTRUCTOR` project-sale block. Not yet
 *  surfaced in any screen — see SPEC 02. */
export interface PurchaseOrderNegotiation {
  negociacion: string
  valorNegociacionVe: string
  tipoEntregaVe: string
  cedulaVe: string
  fechaNegociacionVe: IsoDateTime | null
  ciudadVe: string
  direccionVe: string
  departamentoVe: string
  barrioVe: string
  telefonoVe: string
  nitConstructor: string
}

/** Full shape for `GET /api/v1/ordenes-compra/{ordenCompra}` (§ 1.2). */
export interface PurchaseOrderDetail {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string
  direccionEntrega: string
  barrioEntrega: string
  departamentoEntrega: string
  codigoDaneEntrega: string
  facturacion: PurchaseOrderBillingAddress
  estado: OrderStatus
  codigoSesionRecibo: string | null
  tiendas: Array<PurchaseOrderStore>
  /** Raw `COSTO_TOT_OC`. */
  costoTotalOc: number
  transportadora: string
  fechaMinEntrega: IsoDateTime | null
  fechaMaxEntrega: IsoDateTime | null
  fechaCancelacion: IsoDateTime | null
  /** Raw `STICKER`; Homecenter's `"-1"` sentinel is translated to null. */
  sticker: string | null
  /** Raw `TIPO_OC`, e.g. `"4-Venta Empresa"` — opaque, not parsed here. */
  tipoOc: string
  /** Raw `TIPO_DOCUMENTO`; Homecenter's `-1` sentinel is translated to null. */
  tipoDocumento: string | null
  notaPedido: string
  cedulaComprador: string
  emailCliente: string
  telefonoCliente: string
  clienteRecibe: string
  eanTiendaVenta: string
  eanTiendaFacturacion: string
  localidad: string
  eanEmpresaCompradora: string
  tipoDeOrden: string
  tipoEntrega: string
  observaciones: string
  observacionesNpc: string
  observacionesNpl: string
  /** Platform-only flag (not part of Homecenter's contract) — `true` once
   *  the order is more than 3 months past its `fechaTransmision`, i.e. it
   *  belongs to the archive rather than the day-to-day listing. Age-derived,
   *  not user-toggled — see `incluirHistorial` on `PurchaseOrdersQuery`. */
  archivada: boolean
  /** Raw `FECHA_PAGO`. Optional/unused — no consuming screen yet, see SPEC 02. */
  fechaPago?: IsoDateTime | null
  /** Optional/unused — no consuming screen yet, see SPEC 02. */
  negociacion?: PurchaseOrderNegotiation
}

/** Query params for `GET /api/v1/ordenes-compra` and `.../export` (§ 1.1, § 1.5). */
export interface PurchaseOrdersQuery extends PaginationQuery {
  /** Partial/exact match on the PO number. */
  ordenCompra?: string
  estado?: OrderStatus
  fechaTransmisionDesde?: IsoDate
  fechaTransmisionHasta?: IsoDate
  /** Store EAN. */
  tienda?: string
  /** Raw `IncluirHistorial`. `false` (the default, sent explicitly when
   *  omitted) restricts the listing to orders transmitted within the last 3
   *  months (`archivada: false`); `true` returns the full archive with no
   *  age cutoff. */
  incluirHistorial?: boolean
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
