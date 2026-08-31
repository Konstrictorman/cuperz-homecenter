import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/purchase-orders/')({
  staticData: {
    crumb: 'Órdenes de compra',
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/purchase-orders/"!</div>
}
