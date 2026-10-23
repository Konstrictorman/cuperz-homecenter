// DTOs for the platform's own backend API (`/api/v1`).
// Source: docs/especificacion-endpoints-backend (2).md
//
// One type per request-param object and response body, grouped by process.

// ===========================================================================
// General conventions
// ===========================================================================

/** Paging metadata returned inside every list envelope. */
interface Pagination {
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
interface PaginationQuery {
  page?: number
  /** Default 20, max 100. */
  pageSize?: number
}

/** ISO-8601 calendar date, `YYYY-MM-DD` (the API's own format). */
type IsoDate = string

/** ISO-8601 timestamp, `YYYY-MM-DDTHH:mm:ssZ`. */
export type IsoDateTime = string

// ===========================================================================
// Process 1 — Purchase Orders (Homecenter → Platform) · § 1
// ===========================================================================

export type OrderStatus =
  | 'PENDIENTE'
  | 'DESPACHADO'
  | 'CON_ERROR'
  | 'PROCESANDO'
  | 'CANCELADA'
  /** Formerly `ALISTADO` — still received from the backend until its rename
   *  ships; mapped by `normalizeOrderStatus` (`./order-status`). */
  | 'PREPARADO'
  | 'RECIBIDO'

export type OrderLineStatus =
  'PENDIENTE' | 'DESPACHADO' | 'PARCIAL' | 'CANCELADA' | 'SUPERA_SOLICITADO'

/** Row shape for `GET /api/v1/ordenes-compra` (§ 1.1).
 *
 *  Confirmed against a real response from this endpoint (2026-10-13) —
 *  several fields differ from what docs/especificacion-endpoints-backend
 *  (2).md documents for § 1.1 (`costoTotalOc`/`cantidadTotalSolicitada`/
 *  `numPedido`/`ultimaActualizacion`/`cantidadTiendas`): those names don't
 *  appear on the wire. Treat this shape as the real contract for this
 *  endpoint, not that doc. */
export interface PurchaseOrderSummary {
  ordenCompra: string
  eanPuntoEntrega: string
  cliente: string | null
  ciudadEntrega: string | null
  /** Raw `CANTIDAD_TOT_OC`. */
  cantidadTotOc: number
  /** Raw `COSTO_TOT_OC`. */
  costoTotOc: number
  /** Raw Homecenter status code, e.g. `"1-PENDIENTE"` / `"4-ESTADO FINAL"` —
   *  distinct from the normalised `estado` below. */
  estadoOc: string
  estado: OrderStatus
  /** Raw `FECHA_TRANSMISION`. */
  fechaTransmision: IsoDateTime
  /** Raw `FECHA_MIN_ENTREGA`, normalised — see `PurchaseOrderDetail.fechaMinEntrega`. */
  fechaMinEntrega: IsoDateTime | null
  /** Raw `FECHA_MAX_ENTREGA`, normalised — see `PurchaseOrderDetail.fechaMaxEntrega`. */
  fechaMaxEntrega: IsoDateTime | null
  /** Date-only (`"2026-10-23"`), unlike the other timestamps on this row —
   *  seen set on a `DESPACHADO` order, `null` on a `PENDIENTE` one
   *  (2026-10-22). Presumably the `fechaRealDespacho` the dispatch notice was
   *  sent with. */
  fechaDespacho: IsoDate | null
  /** Platform-only flag (not part of Homecenter's contract), added to the
   *  response 2026-10-22. Set `true` by the backend on a successful
   *  `GET /ordenes-compra/export` (§ 1.5) for that order. */
  exportada: boolean
  /** Raw `STICKER`; Homecenter's `"-1"` "not assigned" sentinel is seen
   *  un-translated here (contrast `PurchaseOrderDetail.sticker`, which the
   *  doc says translates it to `null`). */
  sticker: string | null
  observaciones: string | null
  /** Platform-only field (not part of Homecenter's contract) — distinct from
   *  `PurchaseOrderDetail.notaPedido` (raw `NOTA_PEDIDO`). `null` when unset. */
  numeroPedido: string | null
  /** Seen `null` on every sampled row so far — doesn't obviously map to
   *  `fechaTransmision`/`fechaMinEntrega`/`fechaMaxEntrega`; semantics
   *  unconfirmed. */
  fechaOrden: IsoDateTime | null
}

/** Per-store product line within a `PurchaseOrderDetail`. Homecenter's raw
 *  `GetOrdenesDeCompra` response nests the other way around
 *  (`productos[].tiendas[]`) — the backend inverts that into
 *  `tiendas[].productos[]` before responding, because the platform's screens
 *  (starting with the purchase-order detail table, grouped/expandable by
 *  store) consume it store-first. The frontend never sees Homecenter's raw
 *  shape.
 *
 *  Confirmed against a real `GET /api/v1/ordenes-compra/{ordenCompra}`
 *  response (2026-10-13) — several field names differ from what was
 *  previously assumed here (`eanSku`→`eanProducto`, `skuHomecenter`→`sku`,
 *  `descripcion`→`producto`, `cantidadSolicitada`→`cantidadSku`,
 *  `cantidadDevuelta`→`cantidadDevueltaSku`, `costoUnitario`→`costoSku`);
 *  `condicionPago`/`descuentoSku` don't appear on the wire at all. Treat this
 *  shape as the real contract for this endpoint. */
interface PurchaseOrderStoreLine {
  /** Platform-only internal id, not part of Homecenter's contract. */
  productoId: number
  /** Platform-only internal id, not part of Homecenter's contract. */
  detalleId: number
  /** Homecenter's own internal product code (raw `SKU`), distinct from
   *  `eanProducto`. */
  sku: string
  /** Raw `PRODUCTO` — product description. */
  producto: string
  eanProducto: string
  /** Quantity requested for this SKU specifically at this store. */
  cantidad: number
  /** Raw `CANTIDAD_SKU` — total requested for this SKU across every store on
   *  the order; the same value repeats on each store's entry for the SKU; it
   *  is not store-specific (see `cantidad`). */
  cantidadSku: number
  cantidadCancelada: number
  /** Raw `CANTIDAD_DEVUELTA_SKU`. */
  cantidadDevueltaSku: number
  /** Raw order-line status code, e.g. `"1-PENDIENTE"` — distinct from the
   *  normalised `estadoDetalle` below (mirrors `estadoOc`/`estado` at the
   *  cabecera level). */
  estadoSku: string
  estadoDetalle: OrderLineStatus
  /** Raw `COSTO_SKU`. */
  costoSku: number
  /** Raw `UNIDAD_VENTA`. Seen `null` on a real response. */
  unidadVenta: string | null
  observaciones: string | null
}

/** A store within a `PurchaseOrderDetail`, with the products allocated to it. */
export interface PurchaseOrderStore {
  eanTienda: string
  nombreTienda: string
  productos: Array<PurchaseOrderStoreLine>
}

/** Raw `NEGOCIACION`/`*_VE`/`NIT_CONSTRUCTOR` project-sale block. Not yet
 *  surfaced in any screen — see SPEC 02. */
interface PurchaseOrderNegotiation {
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

/** `cabecera` block of `GET /api/v1/ordenes-compra/{ordenCompra}` (§ 1.2).
 *
 *  Confirmed against a real response from this endpoint (2026-10-13) — the
 *  previous flat (non-`cabecera`-wrapped) shape documented in
 *  docs/especificacion-endpoints-backend (2).md doesn't match the wire at
 *  all: several fields are renamed (`cantidadTotalSolicitada`→`cantidadTotOc`,
 *  `costoTotalOc`→`costoTotOc`, `codigoDaneEntrega`→`codigoDaneCe`,
 *  `eanTiendaVenta`→`tiendaVenta`, `eanTiendaFacturacion`→`tiendaFacturacion`,
 *  `cedulaComprador`→`cedula`, `numPedido`→`numeroPedido`), the nested
 *  `facturacion` object is actually flat (`barrioFac`/`ciudadFac`/
 *  `departamentoFac`/`direccionFac`), and most string fields observed as
 *  `null` here were previously typed as always-present. Treat this shape as
 *  the real contract, not that doc — see `PurchaseOrderSummary`'s doc comment
 *  for the same caveat on the list endpoint. */
export interface PurchaseOrderDetailCabecera {
  ordenCompra: string
  /** Raw `CANTIDAD_TOT_OC`. */
  cantidadTotOc: number
  /** Raw `COSTO_TOT_OC`. */
  costoTotOc: number
  /** Raw `STICKER`; seen un-translated (`"-1"`) on a real response — contrast
   *  the old doc's claim that Homecenter's "not assigned" sentinel gets
   *  translated to `null` here (compare `PurchaseOrderSummary.sticker`,
   *  which never translated it either). */
  sticker: string | null
  /** Raw order-level status code, e.g. `"1-PENDIENTE"` — distinct from the
   *  normalised `estado` below. */
  estadoOc: string
  fechaTransmision: IsoDateTime | null
  cliente: string | null
  ciudadEntrega: string | null
  fechaMinEntrega: IsoDateTime | null
  fechaMaxEntrega: IsoDateTime | null
  fechaDespacho: IsoDateTime | null
  fechaCancelacion: IsoDateTime | null
  transportadora: string
  /** Raw `TIPO_OC`, e.g. `"2-Retail"` — opaque, not parsed here. */
  tipoOc: string
  notaPedido: string | null
  /** Raw `CEDULA`. */
  cedula: string | null
  emailCliente: string | null
  telefonoCliente: string | null
  barrioEntrega: string | null
  departamentoEntrega: string | null
  direccionEntrega: string | null
  /** Raw `BARRIO_FAC` — billing address is flat on the wire, not a nested
   *  object. */
  barrioFac: string | null
  ciudadFac: string | null
  departamentoFac: string | null
  direccionFac: string | null
  /** Raw `TIENDA_VENTA`. */
  tiendaVenta: string | null
  /** Raw `TIENDA_FACTURACION`. */
  tiendaFacturacion: string | null
  localidad: string
  /** Raw `FECHA_PAGO`. Optional/unused — no consuming screen yet, see SPEC 02. */
  fechaPago?: IsoDateTime | null
  eanEmpresaCompradora: string
  tipoDeOrden: string
  tipoEntrega: string
  /** Raw `CODIGO_DANE_CE`. */
  codigoDaneCe: string | null
  observacionesNpc: string
  observacionesNpl: string | null
  clienteRecibe: string | null
  eanPuntoEntrega: string
  estado: OrderStatus
  observaciones: string | null
  /** Platform-only field (not part of Homecenter's contract) — distinct from
   *  `notaPedido` (raw `NOTA_PEDIDO`); same field as
   *  `PurchaseOrderSummary.numeroPedido`. */
  numeroPedido: string | null
  /** Didn't appear at all (not even as `null`) on the real response sampled
   *  for a PENDIENTE order (2026-10-13) — whether it's present for other
   *  `estado` values (e.g. once a receipt notice exists) is unconfirmed. */
  codigoSesionRecibo?: string | null
  /** Same caveat as `codigoSesionRecibo` above — absent on the sampled
   *  response. */
  tipoDocumento?: string | null
  /** Optional/unused — no consuming screen yet, see SPEC 02. */
  negociacion?: PurchaseOrderNegotiation
}

/** Full shape for `GET /api/v1/ordenes-compra/{ordenCompra}` (§ 1.2). */
export interface PurchaseOrderDetail {
  cabecera: PurchaseOrderDetailCabecera
  tiendas: Array<PurchaseOrderStore>
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
}

type SyncMode = 'INCREMENTAL' | 'COMPLETA'

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
  /** As in the Postman sample. Not the order's own status — a reinjected
   *  order stays `PENDIENTE`. */
  estado: 'PROCESANDO'
  /** 1-based: the retry this request just started (`1` on the first one). */
  intentoNumero: number
}

/** Error `code`s `POST .../reinyectar` answers with (§ 1.4 + the "Cuperz
 *  Homecenter API" Postman collection): `404` unknown order, `409` order not
 *  `PENDIENTE` or out of retries. */
export type ReprocessOrderErrorCode =
  'ORDEN_NO_ENCONTRADA' | 'REINTENTO_NO_PERMITIDO'

/**
 * Path params for `GET /api/v1/ordenes-compra/{ordenCompra}/etiquetas/{numTags}`
 * — not in the backend spec; observed against the live backend (2026-10-15).
 * Responds `200 application/pdf` (`etiquetas-{ordenCompra}-{numTags}.pdf`);
 * both params must parse as integers or the backend answers `422`. It wraps
 * Homecenter's `GenerarEtiqueta/{ordenCompra}/{numTags}`.
 */
export interface PurchaseOrderLabelsRequest {
  ordenCompra: string
  /** How many label copies to print. */
  numTags: number
}

/**
 * Body for `POST /api/v1/ordenes-compra/generar-pdf` — not in the backend
 * spec; from the Postman collection. Responds `200 application/pdf`
 * (`ordenes-compra.pdf`, one document for all the orders that exist — unknown
 * ones are skipped, `404` when none exist); wraps Homecenter's `GenerarPdf`.
 */
export interface GeneratePurchaseOrdersPdfRequest {
  ordenes: Array<string>
}

// ===========================================================================
// Process 2 — Dispatch Notices (Platform → Homecenter) · § 2
// ===========================================================================

export type DispatchNoticeStatus =
  'PENDIENTE' | 'DESPACHADA' | 'CON_NOVEDAD' | 'ERROR_ENVIO' | 'CANCELADA'

// --- Hierarchy Order → Store → Container → Product (request payload) ---

interface DispatchNoticeProductInput {
  eanSku: string
  cantidad: number
  /** Required per product. */
  peso: number
  /** Required per product. */
  volumen: number
}

interface DispatchNoticeContainerInput {
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

interface HomecenterIssueItem {
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

interface DispatchNoticeCorrection {
  eanSku: string
  eanTienda: string
  contenedor: string
  cantidadCorregida: number
}

/** Body for `POST /api/v1/avisos-despacho/{avisoId}/reenviar` (§ 2.5). */
export interface ResendDispatchNoticeRequest {
  correcciones: Array<DispatchNoticeCorrection>
}

/** Body for `POST /api/v1/avisos-despacho/enviar` — not in the backend spec;
 *  per the Postman collection. The backend stamps `fechaRealDespacho` on the
 *  order and sends its notice to Homecenter in one call. */
export interface SendDispatchNoticeRequest {
  ordenCompra: string
  fechaRealDespacho: IsoDate
}

/** `200` body for `POST /api/v1/avisos-despacho/enviar` — per the Postman
 *  collection's example. `estado` is `"EXITOSO"` on success; other values are
 *  unconfirmed, so it stays a plain string. A Homecenter rejection may still
 *  arrive as a `200` with `homecenter.isError: true`. */
export interface SendDispatchNoticeResponse {
  ordenCompra: string
  estado: string
  homecenter: HomecenterResult
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
// Dispatch previews — `GET /api/v1/avisos-despacho`.
// Not the § 2.2 list in docs/especificacion-endpoints-backend: the live
// FastAPI backend serves this preview tree on that route instead (its OpenAPI
// leaves the 200 body untyped). Shape from a live response (2026-10-22),
// which added the order totals/dates and per-store `codTienda`. One entry per
// PO, already in the
// Orden→Tienda→Contenedor→Producto shape Homecenter's AvisoDespacho payload
// uses — so the list alone feeds both the table and the payload preview, no
// per-row detail fetch needed.
// ===========================================================================

/** Order `estado` values the live backend returns and filters on
 *  (observed 2026-10-16: `?estado=NODESPACHADO` matches nothing). The param
 *  is typed as a free string (≤30 chars) and Postman also shows `PENDIENTE`,
 *  so the full set is unconfirmed. */
export type DispatchPreviewStatus = 'PREPARADO' | 'DESPACHADO'

/** Numbers arrive as decimal strings (`"6.00"`, `"0.0280"`), exactly as
 *  Homecenter's AvisoDespacho payload carries them. */
export interface DispatchPreviewProduct {
  eanSku: string
  description: string
  cantidad: string
  peso: string
  volumen: string
}

export interface DispatchPreviewContainer {
  contenedor: string
  productos: Array<DispatchPreviewProduct>
}

export interface DispatchPreviewStore {
  /** Data-quality caveat: the backend has been observed sending the literal
   *  string `"None"` (a stringified Python `None`) when the store is unknown. */
  eanTienda: string
  /** Homecenter's short store code (`"10"`, `"53"`). */
  codTienda: string
  nombreTienda: string
  contenedores: Array<DispatchPreviewContainer>
}

export interface DispatchPreviewOrder {
  eanPuntoEntrega: string
  ordenCompra: string
  /** Decimal string (`"39210300.00"`) — the order's total cost after
   *  cross-docking, i.e. of what is actually dispatched. Can be lower than
   *  the original PO's cost (`PurchaseOrder.costoTotOc`). */
  valorTotal: string
  /** Decimal string — sum of every product's `cantidad`. */
  cantidadTotal: string
  /** `null` until the PO has actually been dispatched. */
  fechaRealDespacho: IsoDate | null
  /** The order's status — the source of truth for "dispatched".
   *  `fechaRealDespacho` is not: `PREPARADO` (formerly `ALISTADO`) orders
   *  have been observed with a date set. A free string since values beyond
   *  `DispatchPreviewStatus` may appear. */
  estado: string
  numpedido: string | null
  /** Offset-less datetimes (`"2026-10-12T00:00:00"`), time always midnight
   *  so far. */
  fechaTransmision: IsoDateTime
  minimaFechaEntrega: IsoDateTime
  maximaFechaEntrega: IsoDateTime
  tiendas: Array<DispatchPreviewStore>
}

/** `200` body — note the list lives under `ordenes`, not the usual `data`
 *  of `Paginated<T>`. */
export interface DispatchPreviewsResponse {
  ordenes: Array<DispatchPreviewOrder>
  pagination: Pagination
}

/** Query params. `fechaDesde`/`fechaHasta` must be sent together — either
 *  alone is rejected with `422 RANGO_FECHAS_INCOMPLETO`. */
export interface DispatchPreviewsQuery extends PaginationQuery {
  ordenCompra?: string
  numpedido?: string
  estado?: DispatchPreviewStatus
  fechaDesde?: IsoDate
  fechaHasta?: IsoDate
}

// ===========================================================================
// Integration Log (shared across all 3 processes) · § 3
// ===========================================================================

type IntegrationLogType =
  'ORDEN_COMPRA_SYNC' | 'AVISO_DESPACHO' | 'AVISO_RECIBO'

type IntegrationLogStatus = 'EXITOSO' | 'CON_NOVEDAD' | 'FALLIDO'

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
