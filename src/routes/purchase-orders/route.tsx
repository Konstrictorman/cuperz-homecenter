import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/purchase-orders')({
  staticData: {
    crumb: 'Órdenes de compra',
  },
  component: () => <Outlet />,
})
