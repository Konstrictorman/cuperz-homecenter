import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import MenuBar from './MenuBar'

const meta = {
  title: 'Components/MenuBar',
  component: MenuBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Main navigation, rendered inside the \`Header\`. It takes no props: it reads
the current location through TanStack Router's \`useMatchRoute()\` and marks
the matching group with \`is-active\`.

- **Inicio** navigates to \`/\` and is active only on the home route.
- **Órdenes de Compra** opens a menu with **Detalles**
  (\`/purchase-orders/details\`) and **Despachos**
  (\`/purchase-orders/dispatch\`); it's active on any \`/purchase-orders/*\`
  route (fuzzy match).

The stories below set the router's current path through
\`parameters.tanstack.router\`. The menu items' target routes don't exist in
the story router, so following them shows the framework's "Route not found"
placeholder.
        `,
      },
    },
  },
} satisfies Meta<typeof MenuBar>

export default meta
type Story = StoryObj<typeof meta>

export const HomeActive: Story = {
  parameters: {
    docs: {
      description: { story: 'On `/`: "Inicio" is the active item.' },
    },
  },
}

export const PurchaseOrderDetailsActive: Story = {
  parameters: {
    tanstack: {
      router: { route: { path: '/purchase-orders/details' } },
    },
    docs: {
      description: {
        story:
          'On `/purchase-orders/details`: "Órdenes de Compra" is the active item.',
      },
    },
  },
}

export const PurchaseOrderDispatchActive: Story = {
  parameters: {
    tanstack: {
      router: { route: { path: '/purchase-orders/dispatch' } },
    },
    docs: {
      description: {
        story:
          'On `/purchase-orders/dispatch`: the same group is active — any route under `/purchase-orders` matches.',
      },
    },
  },
}

export const PurchaseOrdersMenuOpen: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Clicks "Órdenes de Compra" to open its submenu with "Detalles" and "Despachos".',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Órdenes de Compra' }),
    )

    // The menu is portalled to <body>, outside the story canvas, and fades
    // in — wait for the transition rather than asserting mid-animation.
    const body = within(canvasElement.ownerDocument.body)
    const details = await body.findByRole('menuitem', { name: 'Detalles' })
    await waitFor(() => expect(details).toBeVisible())
    await expect(
      body.getByRole('menuitem', { name: 'Despachos' }),
    ).toBeVisible()
  },
}
