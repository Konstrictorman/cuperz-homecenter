import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/receipt-notices/')({
  staticData: {
    crumb: 'Avisos de recepción',
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/receipt-notices/"!</div>
}
