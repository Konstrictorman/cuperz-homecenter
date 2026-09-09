import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'
import { setMockGate } from './api/http'

// Dev-only: stand up the MSW mock API before any request goes out. The gate is
// registered synchronously here so `apiFetch` blocks on it even though the mock
// graph (msw, faker) loads lazily — and stays out of prod builds entirely.
if (import.meta.env.DEV) {
  setMockGate(import('./mocks/enable').then((m) => m.enableMocking()))
}

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
