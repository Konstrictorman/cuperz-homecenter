import { createRootRoute, createRoute } from '@tanstack/react-router'
import type { Meta, StoryObj } from '@storybook/tanstack-react'
import Breadcrumbs from './Breadcrumbs'

const rootRoute = createRootRoute({
  staticData: { crumb: 'Inicio' },
})

const purchaseOrdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchase-orders',
  staticData: { crumb: 'Órdenes de compra' },
})

const dispatchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dispatch',
  staticData: { crumb: 'Despachos' },
})

const noCrumbRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sin-breadcrumb',
})

rootRoute.addChildren([purchaseOrdersRoute, dispatchRoute, noCrumbRoute])

const meta = {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Trail of the currently matched route chain, wrapping MUI's \`Breadcrumbs\` and
TanStack Router's \`Link\`. It takes no props — it reads \`useMatches()\` and
picks up any matched route whose \`staticData.crumb\` is set, in the order the
router matched them (root first).

To add a page to the trail, set \`staticData\` on that route:

\`\`\`ts
export const Route = createFileRoute('/purchase-orders/')({
  staticData: { crumb: 'Órdenes de compra' },
  component: RouteComponent,
})
\`\`\`

Every crumb but the last renders as a clickable \`Link\` to that route; the
last one (the current page) renders as bold, non-interactive text. A route
with no \`crumb\` set is skipped rather than rendered as a blank link — see
the "Route Without Crumb Data" story. If nothing in the chain defines a
crumb, the component renders \`null\` (no empty breadcrumb bar).
        `,
      },
    },
  },
} satisfies Meta<typeof Breadcrumbs>

export default meta
type Story = StoryObj<typeof meta>

export const PurchaseOrders: Story = {
  parameters: {
    tanstack: {
      router: { route: purchaseOrdersRoute },
    },
    docs: {
      description: {
        story:
          'Two levels deep: "Inicio" (root) renders as a link back home, "Órdenes de compra" (the current page) renders as bold text.',
      },
    },
  },
}

export const Dispatch: Story = {
  parameters: {
    tanstack: {
      router: { route: dispatchRoute },
    },
    docs: {
      description: {
        story: 'Same shape as "Purchase Orders", on a different route.',
      },
    },
  },
}

export const WithoutCrumbData: Story = {
  parameters: {
    tanstack: {
      router: { route: noCrumbRoute },
    },
    docs: {
      description: {
        story:
          'This route has no `staticData.crumb`, so only the root\'s "Inicio" crumb renders — it becomes the current (bold) crumb rather than being skipped entirely, since it\'s still the only route in the chain with data.',
      },
    },
  },
}
