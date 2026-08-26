import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/receipt-notices/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/receipt-notices/"!</div>
}
