// Single entry point that turns the mock API on. Safe to call on both the
// client and the SSR server; it no-ops outside dev and when mocks are disabled.

import { setMockGate } from '#/api/http'

/** Set `VITE_ENABLE_MOCKS=false` to hit a real backend instead. */
function mocksEnabled(): boolean {
  const flag = import.meta.env.VITE_ENABLE_MOCKS
  if (flag === 'false' || flag === '0') return false
  return import.meta.env.DEV
}

let started: Promise<unknown> | undefined

export function enableMocking(): Promise<unknown> {
  if (!mocksEnabled()) return Promise.resolve()
  if (started) return started

  if (import.meta.env.SSR) {
    started = import('./server').then(({ server }) => {
      server.listen({ onUnhandledRequest: 'bypass' })
    })
  } else {
    started = import('./browser').then(({ worker }) =>
      worker.start({
        onUnhandledRequest: 'bypass',
        quiet: false,
        serviceWorker: { url: '/mockServiceWorker.js' },
      }),
    )
  }

  setMockGate(started)
  return started
}
