import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dispatch/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dispatch/"!</div>
}
