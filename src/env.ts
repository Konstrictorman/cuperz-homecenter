import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SERVER_URL: z.string().url().optional(),
    /** Homecenter's `GenerarPdf` endpoint (server-only — proxied from
     *  `src/routes/api/purchase-orders/$ordenCompra/pdf.ts`, never exposed to
     *  the browser). */
    HOMECENTER_PDF_API_URL: z.string().url(),
    HOMECENTER_PDF_BEARER_TOKEN: z.string().min(1),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
    /** `false`/`0` turns the MSW mock API off (defaults to on in dev). */
    VITE_ENABLE_MOCKS: z.enum(['true', 'false', '0', '1']).optional(),
  },

  /**
   * What object holds the environment variables at runtime.
   *
   * `import.meta.env` only carries `VITE_`-prefixed vars (Vite's client
   * exposure rule applies even in SSR/server code) — server-only vars like
   * `HOMECENTER_PDF_API_URL` live in `process.env` instead, which Vite's
   * `loadEnv` populates from `.env*` files for every var regardless of
   * prefix. `process` doesn't exist in the browser, so guard for that.
   */
  runtimeEnv:
    typeof process !== 'undefined'
      ? { ...import.meta.env, ...process.env }
      : import.meta.env,

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
})
