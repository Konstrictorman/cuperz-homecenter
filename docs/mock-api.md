# Mock API (MSW)

Until the Python backend exists, the whole `/api/v1` surface from
`especificacion-endpoints-backend (2).md` is served by [MSW](https://mswjs.io)
from fake-but-realistic in-memory data. This lets the React app run against a
"real" API today.

## How it's wired

| Piece                                 | Path                                                |
| ------------------------------------- | --------------------------------------------------- |
| Typed DTOs (params + responses)       | `src/api/types.ts`                                  |
| Fetch wrapper + `ApiError`            | `src/api/http.ts`                                   |
| TanStack Query hooks / `queryOptions` | `src/api/ordenes.ts`, `avisos.ts`, `bitacora.ts`    |
| Query keys                            | `src/api/query-keys.ts`                             |
| MSW request handlers                  | `src/mocks/handlers/` (combined in `registry.ts`)   |
| Seeded in-memory store                | `src/mocks/data/` (`catalogo.ts`, `db.ts`)          |
| Worker / server bootstrap             | `src/mocks/browser.ts`, `server.ts`, `enable.ts`    |
| Service-worker script                 | `public/mockServiceWorker.js` (vendored, committed) |

`src/router.tsx` calls `enableMocking()` in dev only and registers a readiness
gate on `apiFetch`, so no request is ever made before the worker is
intercepting. The dynamic import keeps `msw` and `@faker-js/faker` out of
production bundles entirely.

## Running it

```bash
npm run dev
```

Open the app — the console shows `[MSW] Mocking enabled` and every
`GET/POST /api/v1/...` is logged. To hit a real backend instead, set
`VITE_ENABLE_MOCKS=false`.

## Using the API layer in a component

```tsx
import { useQuery } from '@tanstack/react-query'
import { ordenesListQueryOptions, useReinyectarOrden } from '#/api/ordenes'

const { data } = useQuery(
  ordenesListQueryOptions({ estado: 'CON_ERROR', page: 1 }),
)
const reinyectar = useReinyectarOrden()
// reinyectar.mutate('8467343')
```

Queries run client-side (no route loaders), so SSR renders the pending state and
the client fetches on hydration.

## Seed data

`src/mocks/data/db.ts` seeds once per process with a fixed faker seed:

- **45 órdenes de compra**, incl. the canonical `8467343` from the spec, spread
  across `PENDIENTE / PROCESANDO / DESPACHADA / CON_ERROR`.
- **~12 avisos de despacho** in `BORRADOR / ENVIADO / CON_NOVEDAD / ERROR_ENVIO`.
- One `ORDEN_COMPRA_SYNC` bitácora entry per order + one `AVISO_DESPACHO` entry
  per sent notice, each with the raw Homecenter request/response payload.

Writes (`POST`, `reenviar`, `reinyectar`, `sincronizar`) mutate the store and
add bitácora entries; a full page reload resets everything.

### Behaviours worth knowing

- `POST /avisos-despacho` replays the "cantidad > solicitada" check and returns
  `400 CANTIDAD_EXCEDE_SOLICITADO` **before** any Homecenter call.
- A line whose `cantidad` reaches 100% of what was requested comes back as
  `CON_NOVEDAD` (the `isError:false` + `errorMessage` pattern).
- Name any contenedor `*ERR*` to force `502 HOMECENTER_NO_DISPONIBLE`.
- `reinyectar` only works on `CON_ERROR` orders and respects a 3-attempt cap
  (`409 REINTENTO_NO_PERMITIDO`).
- `reenviar` only works on `CON_NOVEDAD` / `ERROR_ENVIO` (`409 AVISO_NO_REENVIABLE`).

## Tests

`src/mocks/handlers/handlers.test.ts` runs the handlers through `msw/node`
(`@jest-environment node`). `jest.config.cjs` transforms MSW's ESM-only deps.
