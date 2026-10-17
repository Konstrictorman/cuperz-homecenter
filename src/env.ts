import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SERVER_URL: z.string().url().optional(),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
    /** `true`/`1` turns the MSW mock API on (defaults to off — hits VITE_API_BASE_URL). */
    VITE_ENABLE_MOCKS: z.enum(['true', 'false', '0', '1']).optional(),
    /**
     * Origin of Cirkus's own FastAPI backend for this platform — not
     * Homecenter itself, it wraps Homecenter's REST HUB internally (e.g. an
     * ngrok tunnel to a dev machine, or the deployed QA/Production host).
     * `/api/v1` is appended by `src/api/http.ts`. Only consulted when
     * `VITE_ENABLE_MOCKS` is off — unset falls back to same-origin `/api/v1`.
     */
    VITE_API_BASE_URL: z.string().url().optional(),
  },

  /**
   * What object holds the environment variables at runtime.
   *
   * `import.meta.env` only carries `VITE_`-prefixed vars (Vite's client
   * exposure rule applies even in SSR/server code) — server-only vars like
   * `SERVER_URL` live in `process.env` instead, which Vite's
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
