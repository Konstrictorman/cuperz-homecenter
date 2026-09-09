# Especificación de Endpoints — Backend Propio

Plataforma de Integración Cuperz-Homecenter · API interna consumida por el frontend (React)
Backend: Python · Persistencia: SQL Server · Autenticación: SSO vía OCI IAM

> **Alcance de este documento**: procesos de **Órdenes de Compra** y **Avisos de Despacho** únicamente. El proceso de Avisos de Recibo queda fuera — no hay evidencia suficiente del contrato de Homecenter para especificarlo sin especular (ver sección final).

---

## Convenciones generales

Estas reglas aplican a todos los endpoints de este documento. Son **decisiones de diseño propuestas**, no hechos confirmados por ningún documento del cliente — quedan marcadas así para que se validen antes de implementar.

| Aspecto                       | Convención propuesta                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Base path                     | `/api/v1`                                                                                              |
| Autenticación                 | `Authorization: Bearer <token>` — token emitido tras el login SSO contra OCI IAM                       |
| Formato de fecha (API propia) | ISO 8601 (`YYYY-MM-DD`). El backend traduce al formato que exige Homecenter (`DD/MM/AAAA`) al llamarlo |
| Paginación                    | Query params `page` (default 1) y `pageSize` (default 20, máx. 100)                                    |
| Envoltura de listados         | `{ "data": [...], "pagination": { "page", "pageSize", "total", "totalPages" } }`                       |
| Formato de error              | Ver bloque siguiente                                                                                   |
| Content-Type                  | `application/json` en todos los endpoints                                                              |

**Formato de error estándar:**

```json
{
  "error": {
    "code": "ORDEN_NO_ENCONTRADA",
    "message": "La orden de compra 8467343 no existe en el sistema.",
    "details": []
  }
}
```

**Códigos HTTP usados:** `200` OK · `201` Creado · `202` Aceptado (proceso asíncrono) · `400` Validación · `401` No autenticado · `404` No encontrado · `409` Conflicto (p. ej. reenvío no permitido) · `502` Error del sistema externo (Homecenter no disponible o rechazó la solicitud).

---

## 1. Órdenes de Compra

Corresponde al **Proceso 1** de la documentación del cliente (Homecenter → Plataforma). Basado en el contrato real de la colección Postman `Integración Proveedores OC 2024`.

### 1.1 `GET /api/v1/ordenes-compra`

Listado de órdenes ya sincronizadas en la base propia (no consulta a Homecenter en vivo — para eso existe 1.3).

**Query params**

| Parámetro                   | Tipo   | Obligatorio | Descripción                                          |
| --------------------------- | ------ | ----------- | ---------------------------------------------------- |
| `ordenCompra`               | string | No          | Búsqueda parcial/exacta por número de OC             |
| `estado`                    | string | No          | `PENDIENTE`, `DESPACHADA`, `CON_ERROR`, `PROCESANDO` |
| `fechaDesde` / `fechaHasta` | date   | No          | Rango de fecha de la orden                           |
| `tienda`                    | string | No          | Filtra por EAN de tienda                             |
| `page`, `pageSize`          | int    | No          | Ver convenciones generales                           |

**Respuesta `200`**

```json
{
  "data": [
    {
      "ordenCompra": "8467343",
      "eanPuntoEntrega": "7703670529804",
      "cliente": "Cali Sur",
      "ciudadEntrega": "Cali",
      "cantidadTiendas": 2,
      "cantidadTotalSolicitada": 60,
      "estado": "PENDIENTE",
      "fechaOrden": "2026-08-15",
      "ultimaActualizacion": "2026-08-20T09:14:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 47, "totalPages": 3 }
}
```

---

### 1.2 `GET /api/v1/ordenes-compra/{ordenCompra}`

Detalle completo de una orden: tiendas, productos, cantidades solicitadas/canceladas/devueltas y estado por línea — según el nivel de detalle que ya vimos en la respuesta real de Homecenter (`ESTADO_SKU`, `CODIGO_SESION_RECIBO`, cantidades por producto/tienda).

**Respuesta `200`**

```json
{
  "ordenCompra": "8467343",
  "eanPuntoEntrega": "7703670529804",
  "cliente": "Cali Sur",
  "direccionEntrega": "Cra 12 N27-31, Tunja",
  "estado": "PENDIENTE",
  "codigoSesionRecibo": null,
  "tiendas": [
    {
      "eanTienda": "7703670900306",
      "productos": [
        {
          "eanSku": "7703670004288",
          "descripcion": "MALLA ESLABONADA 1.8x10m METAL 2.1/4x2.1/4 2.5 mm",
          "cantidadSolicitada": 30,
          "cantidadCancelada": 0,
          "cantidadDevuelta": 0,
          "estadoLinea": "PENDIENTE"
        }
      ]
    }
  ]
}
```

**Errores:** `404` con `code: "ORDEN_NO_ENCONTRADA"` si no existe.

---

### 1.3 `POST /api/v1/ordenes-compra/sincronizar`

Dispara una consulta contra el API de Homecenter (`GetOrdenesDeCompra` / equivalente) para traer órdenes nuevas o actualizar existentes. Cubre tanto la descarga automática programada como el botón **"Descarga manual ↻"** del wireframe.

**Body**

```json
{ "modo": "INCREMENTAL" }
```

`modo`: `INCREMENTAL` (solo lo nuevo desde la última sincronización) o `COMPLETA` (fuerza traer todo el rango configurado).

**Respuesta `202`** — la sincronización corre de forma asíncrona (puede tardar según el volumen); se devuelve un identificador para consultar el resultado en la Bitácora.

```json
{ "sincronizacionId": "sync-20260822-0091", "estado": "EN_PROCESO" }
```

> **Supuesto marcado**: se asume que esta llamada es asíncrona porque el volumen de OC puede ser alto. Si Homecenter responde rápido y en lote pequeño, podría ser síncrona (`200` con el resultado directo) — a validar con el volumen real esperado.

---

### 1.4 `POST /api/v1/ordenes-compra/{ordenCompra}/reinyectar`

Reintento manual para una orden en estado `CON_ERROR` (ver conversación sobre el botón "Reinyectar seleccionadas"). Vuelve a intentar el procesamiento/envío hacia el sistema destino (ERP) sin recrear el registro.

**Respuesta `200`**

```json
{ "ordenCompra": "8467343", "estado": "PROCESANDO", "intentoNumero": 2 }
```

**Errores:**

- `409 REINTENTO_NO_PERMITIDO` — si la orden no está en estado `CON_ERROR`, o si ya alcanzó el máximo de reintentos configurado.

---

### 1.5 `GET /api/v1/ordenes-compra/export`

Exporta la información de órdenes en CSV, para consumo manual por los usuarios del módulo Cross-Docking legado (sin integración directa — ver diagrama de arquitectura ya construido).

**Query params:** los mismos filtros de 1.1 (`estado`, `fechaDesde`, `fechaHasta`, `tienda`).

**Respuesta `200`** — `Content-Type: text/csv`, archivo descargable.

> **Vacío real, no solo supuesto**: el formato exacto de columnas del CSV (nombres, orden, separador) debe coincidir con lo que el módulo Cross-Docking ya consume hoy — no tenemos ese layout documentado. Este endpoint necesita el archivo de ejemplo actual antes de implementarse.

---

## 2. Avisos de Despacho

Corresponde al **Proceso 2** (Plataforma → Homecenter). Basado en `POST /api/AvisoDespacho` y `GET GetAvisosDespachoPorTienda` de la documentación oficial y la colección Postman de Homecenter.

### 2.1 `POST /api/v1/avisos-despacho`

Crea (y opcionalmente envía) un aviso de despacho. El payload refleja la jerarquía real que exige Homecenter — el backend la valida, la traduce (fecha a `DD/MM/AAAA`) y la reenvía.

**Body**

```json
{
  "ordenCompra": "8467343",
  "fechaRealDespacho": "2026-08-20",
  "enviarInmediatamente": true,
  "tiendas": [
    {
      "eanTienda": "7703670900306",
      "contenedores": [
        {
          "contenedor": "CONT001",
          "productos": [
            {
              "eanSku": "7703670004288",
              "cantidad": 10,
              "peso": 150.5,
              "volumen": 1.75
            }
          ]
        }
      ]
    }
  ]
}
```

`enviarInmediatamente: false` guarda como borrador (botón **"Guardar borrador"** del wireframe) sin llamar todavía a Homecenter.

**Validación previa al envío (replicando en frontend/backend la regla que Homecenter aplica en su lado):** por cada `eanSku` + `eanTienda`, la suma de `cantidad` en todos los contenedores no debe superar `cantidadSolicitada` de la orden (dato ya disponible vía 1.2). Si se supera, el backend responde `400` **antes** de llamar a Homecenter, para no gastar la llamada externa en algo que sabemos que va a fallar.

**Respuesta `201` (envío exitoso, sin novedad)**

```json
{
  "avisoId": "av-8467343-001",
  "ordenCompra": "8467343",
  "estado": "ENVIADO",
  "homecenter": { "isError": false, "errorMessage": null }
}
```

**Respuesta `201` (envío con novedad — Homecenter aceptó la llamada pero reportó un problema en una línea)**

```json
{
  "avisoId": "av-8467343-002",
  "ordenCompra": "8467343",
  "estado": "CON_NOVEDAD",
  "homecenter": {
    "isError": false,
    "errorMessage": "Se presentaron errores en algunos items ver resultado",
    "detalle": [
      {
        "eanSku": "7703670004288",
        "eanTienda": "7703670900306",
        "mensaje": "El producto:'7703670004288' dirigido a la tienda:'7703670900306' supera la cantidad solicitada:'30'"
      }
    ]
  }
}
```

> El backend debe interpretar explícitamente el patrón `isError: false` + `errorMessage` no nulo de Homecenter como `CON_NOVEDAD` — no como éxito puro ni como fallo total (patrón ya señalado como ambiguo en la documentación original de Homecenter).

**Errores:**

- `400 CANTIDAD_EXCEDE_SOLICITADO` — validación previa fallida.
- `502 HOMECENTER_NO_DISPONIBLE` — timeout o error de conexión al llamar a Homecenter; el aviso queda guardado en estado `ERROR_ENVIO` para reintento (ver 2.5).

---

### 2.2 `GET /api/v1/avisos-despacho`

Listado de avisos ya generados en la plataforma (no es la consulta en vivo a Homecenter — para eso existe 2.4).

**Query params:** `ordenCompra`, `estado` (`BORRADOR`, `ENVIADO`, `CON_NOVEDAD`, `ERROR_ENVIO`), `fechaDesde`, `fechaHasta`, `page`, `pageSize`.

**Respuesta `200`**

```json
{
  "data": [
    {
      "avisoId": "av-8467343-001",
      "ordenCompra": "8467343",
      "fechaRealDespacho": "2026-08-20",
      "cantidadContenedores": 3,
      "estado": "ENVIADO",
      "fechaEnvio": "2026-08-20T14:02:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 12, "totalPages": 1 }
}
```

---

### 2.3 `GET /api/v1/avisos-despacho/{avisoId}`

Detalle completo de un aviso: árbol orden→tienda→contenedor→producto tal como se envió, más un resumen de auditoría. **No incluye la respuesta cruda de Homecenter** — esa vive en `hc_integracion_log` como única fuente de verdad, expuesta por el endpoint transversal `GET /api/v1/integracion-log/{integracionLogId}` (ver sección **3. Bitácora de Integración**, común a los tres procesos).

**Respuesta `200`** — misma estructura del body de 2.1, más:

```json
{
  "avisoId": "av-8467343-001",
  "estado": "ENVIADO",
  "intentos": 1,
  "integracionLogId": "log-20260820-14020091"
}
```

`integracionLogId` es la referencia al registro de auditoría correspondiente al envío más reciente de este aviso — el frontend lo usa para pedir el payload crudo bajo demanda vía la sección 3.

---

### 2.4 `GET /api/v1/avisos-despacho/{avisoId}/ean128`

Proxy hacia `GetAvisosDespachoPorTienda` de Homecenter: consulta y sincroniza los códigos EAN128 generados para los contenedores de este aviso. Cubre la pantalla **"Avisos y EAN128"** del wireframe.

**Respuesta `200`**

```json
{
  "avisoId": "av-8467343-001",
  "contenedores": [
    {
      "contenedor": "CONT001",
      "eanSku": "7703670004288",
      "cantidadSolicitada": 30,
      "cantidadDespachada": 10,
      "peso": 150.5,
      "volumen": 1.75,
      "ean128": "377000269300030093"
    }
  ]
}
```

---

### 2.5 `POST /api/v1/avisos-despacho/{avisoId}/reenviar`

Reenvío de un aviso que quedó en `CON_NOVEDAD` o `ERROR_ENVIO`, tras corregir el dato en el frontend (Escenario 4 discutido en el diseño funcional: reenviar solo el ítem afectado, no todo el aviso).

**Body**

```json
{
  "correcciones": [
    {
      "eanSku": "7703670004288",
      "eanTienda": "7703670900306",
      "contenedor": "CONT002",
      "cantidadCorregida": 20
    }
  ]
}
```

**Respuesta `200`** — misma forma que 2.1, con `intentos` incrementado.

**Errores:**

- `409 AVISO_NO_REENVIABLE` — si el aviso está en estado `ENVIADO` (sin novedad) o `BORRADOR`; el reenvío solo aplica a avisos con problema.

---

### 2.6 `GET /api/v1/avisos-despacho/{avisoId}/intentos`

Historial de todos los intentos de envío/reenvío de un aviso, cada uno con su `integracionLogId` correspondiente (ver 2.3). Cubre la trazabilidad completa exigida por la Cláusula Quinta del contrato sin sobrecargar el endpoint de detalle.

**Respuesta `200`**

```json
{
  "avisoId": "av-8467343-002",
  "intentos": [
    {
      "numero": 1,
      "fecha": "2026-08-20T14:02:00Z",
      "estado": "CON_NOVEDAD",
      "integracionLogId": "log-20260820-14020091"
    },
    {
      "numero": 2,
      "fecha": "2026-08-20T16:30:00Z",
      "estado": "ENVIADO",
      "integracionLogId": "log-20260820-16300045"
    }
  ]
}
```

---

## 3. Bitácora de Integración _(transversal)_

A diferencia de las secciones 1 y 2, este endpoint **no pertenece a un solo proceso** — es la fuente única de payloads crudos para Órdenes de Compra, Avisos de Despacho y, en su momento, Avisos de Recibo. Existe para que ningún otro endpoint necesite duplicar el request/response completo intercambiado con Homecenter (ver discusión sobre por qué `GET /avisos-despacho/{id}` no trae la respuesta cruda inline).

### 3.1 `GET /api/v1/integracion-log/{integracionLogId}`

Devuelve el request/response completo de una transacción puntual contra Homecenter.

**Respuesta `200`**

```json
{
  "integracionLogId": "log-20260820-14020091",
  "tipo": "ORDEN_COMPRA_SYNC" | "AVISO_DESPACHO" | "AVISO_RECIBO",
  "fecha": "2026-08-20T14:02:00Z",
  "requestEnviado": { "...": "payload exacto enviado a Homecenter" },
  "respuestaRecibida": { "...": "payload exacto recibido de Homecenter" }
}
```

**Errores:** `404` con `code: "LOG_NO_ENCONTRADO"` si el ID no existe.

### 3.2 `GET /api/v1/integracion-log`

Listado/búsqueda de la bitácora completa, independiente del proceso de origen — cubre la pantalla **"Bitácora e integración"** del wireframe (pestañas Todos / Órdenes de compra / Avisos de despacho / Avisos de recibo).

**Query params:** `tipo` (`ORDEN_COMPRA_SYNC`, `AVISO_DESPACHO`, `AVISO_RECIBO`), `estado` (`EXITOSO`, `CON_NOVEDAD`, `FALLIDO`), `fechaDesde`, `fechaHasta`, `page`, `pageSize`.

**Respuesta `200`**

```json
{
  "data": [
    {
      "integracionLogId": "log-20260820-14020091",
      "tipo": "AVISO_DESPACHO",
      "fecha": "2026-08-20T14:02:00Z",
      "estado": "CON_NOVEDAD",
      "referencia": "av-8467343-001"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 84, "totalPages": 5 }
}
```

`referencia` apunta al `avisoId` o `ordenCompra` correspondiente, según `tipo` — así el frontend puede enlazar cada fila de la bitácora de vuelta al recurso específico (Aviso 2.3, Orden 1.2, etc.).

---

## Mapeo con el contrato real de Homecenter

| Endpoint propio                    | Endpoint de Homecenter que consume internamente                            |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `POST /ordenes-compra/sincronizar` | `POST /api/dummyIntegracion/GetOrdenesDeCompra` (u homólogo de producción) |
| `POST /avisos-despacho`            | `POST /api/AvisoDespacho`                                                  |
| `GET /avisos-despacho/{id}/ean128` | `GET /AvisoDespacho/GetAvisosDespachoPorTienda/{ordenCompra}`              |

> Nota: el ambiente "dummy" (`qa-api-dummy-integracion`) que aparece en el Swagger cargado expone las mismas operaciones (`GenerarEtiqueta`, `AvisoDespacho`, `GetOrdenesDeCompra`, `GetAvisosDespachoPorTienda`) bajo otro _base path_ — probablemente es el ambiente de pruebas interno de Homecenter para simular respuestas antes de homologar contra QA real. Vale la pena confirmar con Homecenter si el equipo debe integrar primero contra este dummy antes de QA.

---

## Pendiente — Avisos de Recibo

No incluido en este documento. No existe Swagger, colección Postman, ni un solo ejemplo de payload de Homecenter para este proceso — cualquier endpoint que se documente hoy sería especulación. Antes de especificarlo se necesita el contrato técnico real de Homecenter para `Avisos de Recibo`, o al menos confirmación de qué campos trae (se sabe únicamente, por el documento de cronograma, que debe incluir el código de sesión de recibo).
