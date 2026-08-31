import { createRootRoute, createRoute } from '@tanstack/react-router'
import type { Meta, StoryObj } from '@storybook/tanstack-react'
import Breadcrumbs from './Breadcrumbs'

const rootRoute = createRootRoute({
  staticData: { crumb: 'Plataforma Homecenter' },
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
} satisfies Meta<typeof Breadcrumbs>

export default meta
type Story = StoryObj<typeof meta>

export const PurchaseOrders: Story = {
  parameters: {
    tanstack: {
      router: { route: purchaseOrdersRoute },
    },
  },
}

export const Dispatch: Story = {
  parameters: {
    tanstack: {
      router: { route: dispatchRoute },
    },
  },
}

export const WithoutCrumbData: Story = {
  parameters: {
    tanstack: {
      router: { route: noCrumbRoute },
    },
  },
}
