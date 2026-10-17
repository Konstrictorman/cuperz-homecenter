/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import path from 'node:path'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

const dirname = import.meta.dirname

/**
 * `npm run dev` counterpart of the reverse proxy in Docker
 * (docker/nginx/default.conf.template): the browser always calls same-origin
 * `/api/v1`, forwarded here to the FastAPI backend at `BACKEND_URL` (an
 * origin, e.g. an ngrok tunnel — read from `.env.local`/`.env`).
 *
 * Nitro's `devProxy`, not Vite's `server.proxy`: Nitro's dev middleware
 * answers every request before Vite's proxy runs. Dev server only.
 */
function backendProxy(
  backendUrl: string | undefined,
): Record<string, { target: string; changeOrigin: boolean }> {
  if (!backendUrl) return {}
  return {
    '/api/v1/**': {
      target: backendUrl,
      changeOrigin: true,
    },
  }
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const config = defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    devtools({ eventBusConfig: { enabled: false } }),
    nitro({
      devProxy: backendProxy(loadEnv(mode, dirname, '').BACKEND_URL),
      rollupConfig: {
        external: [/^@sentry\//],
      },
    }),
    tanstackStart(),
    viteReact(),
  ],
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
}))
export default config
