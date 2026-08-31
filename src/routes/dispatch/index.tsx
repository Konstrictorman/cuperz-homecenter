import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dispatch/')({
  staticData: {
    crumb: 'Despachos',
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dispatch/"!</div>
}
