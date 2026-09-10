import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/purchase-orders/')({
  // The crumb comes from the `/purchase-orders` layout route (route.tsx).
  beforeLoad: () => {
    throw redirect({ to: '/purchase-orders/details' })
  },
})
