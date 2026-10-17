# Plataforma Cuperz-Homecenter — Frontend

Aplicación React (TanStack Start, con SSR sobre Nitro) que consume la API REST del backend propio (Python/FastAPI). No se comunica directamente con Homecenter ni con ningún sistema externo — toda integración pasa por el backend.

## Stack técnico

| Capa           | Tecnología                                                      |
| -------------- | --------------------------------------------------------------- |
| Framework      | React 19 + TanStack Start / TanStack Router (rutas por archivo) |
| Build / server | Vite + Nitro (preset `node-server`)                             |
| UI             | MUI (Material UI + Emotion) + MUI X Data Grid                   |
| Consumo de API | `apiFetch` (`src/api/http.ts`) + TanStack Query                 |
| Mock de API    | MSW sobre datos semilla (`src/mocks`, ver `docs/mock-api.md`)   |
| Autenticación  | SSO vía OCI IAM (ver sección Autenticación)                     |
| Hosting        | Oracle Cloud Infrastructure (OCI) — servidor Node               |

### Por qué Vite y no Next.js

- El backend propio ya expone la API REST — el valor central de Next.js (API routes/server actions) no aplica aquí.
- Plataforma interna detrás de autenticación, sin necesidad de SEO.
- La interacción principal (árbol Orden→Tienda→Contenedor→Producto, wizards de varios pasos, validaciones en tiempo real) es terreno natural de una SPA.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script                    | Uso                                |
| ------------------------- | ---------------------------------- |
| `npm run build`           | Build de producción en `.output/`  |
| `npm run preview`         | Sirve el build de producción       |
| `npm run typecheck`       | `tsc --noEmit`                     |
| `npm run lint`            | ESLint                             |
| `npm run check`           | Verificación de formato (Prettier) |
| `npm run format`          | Aplica Prettier + `eslint --fix`   |
| `npm test`                | Pruebas unitarias (Jest)           |
| `npm run storybook`       | Storybook en http://localhost:6006 |
| `npm run generate-routes` | Regenera `src/routeTree.gen.ts`    |

El build de producción es un servidor Node autocontenido:

```bash
npm run build
node .output/server/index.mjs
```

## Estilos

La UI usa MUI (Material UI + Emotion); no hay framework de CSS utilitario.

- **Tokens de diseño** en `src/tokens.css` (mantenidos a mano). `src/styles.css` define alias semánticos (`--line`, `--body-text`, `--bg-base`, …) y las reglas globales.
- **El tema MUI** (`src/theme/index.ts`) refleja esos tokens: paleta (esquemas claro y oscuro), tipografía y radios. Usa `createTheme` con `cssVariables`; el modo oscuro depende del atributo `data-theme` que alternan `ThemeContext` y el script de `__root.tsx`, sin re-render ni parpadeo en SSR.
- **Estilos por componente**: cada componente importa su propio `ComponentName.css` (clases tipo BEM, selectores planos, valores `var(--token)`, `!important` solo para sobrescribir internos de MUI). Lo que sea de tema va en el tema MUI.

Si cambian los tokens, actualizar `src/tokens.css` **y** los mapas de color de `src/theme/index.ts`.

## Posición en la arquitectura

```
Frontend (React, SSR)
   │  REST/JSON + Bearer token
   ▼
Backend propio (Python) ──> API REST Homecenter
   │
   ▼
SQL Server
```

El frontend nunca llama a Homecenter directamente. Todo el contrato de datos que consume es el del backend propio, especificado en `especificacion-endpoints-backend.md` — no el de Homecenter.

## Autenticación

- Login vía redirección a **OCI IAM** (SSO).
- Tras el login, el frontend recibe un token y lo envía en cada request al backend como `Authorization: Bearer <token>`.
- El mecanismo exacto de intercambio de token (dónde se almacena, cómo se refresca) **no está definido todavía** — pendiente de validar contra la configuración real de OCI IAM antes de implementar el módulo de auth.

## Consumo de API

- Base URL configurable por ambiente (ver Variables de entorno).
- Todas las respuestas de listado usan el sobre `{ data: [...], pagination: {...} }`.
- Todos los errores usan el formato `{ error: { code, message, details } }` — mapear a mensajes de UI por `code`, no por `message` (el texto puede cambiar).
- Fechas: la API expone/recibe ISO 8601 (`YYYY-MM-DD`); el formato `DD/MM/AAAA` es exclusivo del contrato con Homecenter y lo traduce el backend — el frontend no debe reimplementar esa conversión.
- Contrato completo de endpoints: `especificacion-endpoints-backend.md`.

## Validaciones en frontend

Reglas a replicar en el cliente para dar feedback inmediato (el backend las revalida igual antes de llamar a Homecenter):

| Campo / regla                              | Validación en UI                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Cantidad por producto en Aviso de Despacho | Suma de `cantidad` entre contenedores no debe superar `cantidadSolicitada` de la orden (dato disponible en el detalle de OC) |
| `familia` en producto                      | Opcional — no marcar como campo requerido en el formulario                                                                   |
| Contenedor                                 | Alfanumérico, puede repetirse con distintos productos dentro de la misma tienda                                              |
| Multi-tienda / multi-SKU                   | Un aviso puede incluir varias tiendas y varios SKU por contenedor — el formulario debe soportarlo, no asumir 1:1             |

## Pantallas / rutas

Prototipo de referencia: `wireframes-plataforma-homecenter.html`.

| Ruta (sugerida)          | Pantalla                             | Endpoint(s) principal(es)                                  |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| `/`                      | Panel principal                      | Agregado de OC/avisos/bitácora                             |
| `/ordenes-compra`        | Listado y detalle de OC              | `GET /ordenes-compra`, `GET /ordenes-compra/{id}`          |
| `/avisos-despacho/nuevo` | Wizard de generación de aviso        | `POST /avisos-despacho`                                    |
| `/avisos-despacho`       | Consulta de avisos y EAN128          | `GET /avisos-despacho`, `GET /avisos-despacho/{id}/ean128` |
| `/avisos-recibo`         | Avisos de recibo                     | **Pendiente** — sin spec de backend aún                    |
| `/bitacora`              | Bitácora e integración (transversal) | `GET /integracion-log`                                     |

Principio de diseño: la mayoría de campos se heredan de la orden y del catálogo; el usuario confirma y corrige por excepción, no captura desde cero.

## Design tokens

```css
--cuperz-primary: #bf0028; /* headers, CTAs, acentos, badges */
--cuperz-dark: #1f1f1f; /* fondos oscuros alternativos */
--cuperz-white: #ffffff; /* fondo principal */
```

## Variables de entorno

Validadas en `src/env.ts`. En desarrollo se leen de `.env.local` (no versionado).

| Variable             | Tipo     | Descripción                                                                                                                      |
| -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`  | build    | Origen del backend propio (se le añade `/api/v1`). Sin definir → mismo origen (`/api/v1`)                                        |
| `VITE_ENABLE_MOCKS`  | build    | `true`/`1` activa el mock MSW en lugar del backend real                                                                          |
| `VITE_APP_TITLE`     | build    | Opcional                                                                                                                         |
| `BETTER_AUTH_URL`    | servidor | URL base para Better Auth                                                                                                        |
| `BETTER_AUTH_SECRET` | servidor | Secreto de Better Auth                                                                                                           |
| `SERVER_URL`         | servidor | Opcional                                                                                                                         |
| `VITE_OCI_IAM_*`     | build    | Configuración del cliente SSO (endpoint de autorización, client id) — **pendiente de definir con los valores reales de OCI IAM** |

Las variables `VITE_*` se incrustan en el bundle **al compilar**; cambiarlas exige reconstruir. Las de servidor se leen en tiempo de ejecución.

## Estado

| Área                                                    | Estado                                               |
| ------------------------------------------------------- | ---------------------------------------------------- |
| Wireframes / flujo de pantallas                         | Completo                                             |
| Contrato de API (Órdenes de Compra, Avisos de Despacho) | Completo — ver `especificacion-endpoints-backend.md` |
| Contrato de API (Avisos de Recibo)                      | Pendiente — bloqueado en el backend                  |
| Flujo de autenticación SSO (detalle de implementación)  | Pendiente de definir                                 |
| Formato de exportación CSV (pantalla Cross-Docking)     | Pendiente                                            |
