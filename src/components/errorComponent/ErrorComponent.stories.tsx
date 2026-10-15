import type { Meta, StoryObj } from '@storybook/tanstack-react'
import ErrorComponent from './ErrorComponent'

/** An error with a stable, readable stack instead of Storybook's own frames. */
function sampleError(message: string) {
  const error = new Error(message)
  error.stack = `Error: ${message}
    at fetchPurchaseOrders (src/api/purchaseOrders.ts:42:11)
    at async Object.loader (src/routes/purchase-orders/details/index.tsx:18:5)`
  return error
}

const meta = {
  title: 'Components/ErrorComponent',
  component: ErrorComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
The root route's \`errorComponent\`: shown when a route throws while loading
or rendering. It receives TanStack Router's \`ErrorComponentProps\`:

- \`error.message\` is shown as the description (with a generic fallback when
  it's empty).
- **Reintentar** calls \`reset\`; **Volver al panel principal** navigates to
  \`/\`.
- In development builds only, a collapsible "Detalles técnicos" section shows
  \`error.stack\` and \`info.componentStack\`.
        `,
      },
    },
  },
  argTypes: {
    error: { control: false },
    info: { control: false },
  },
} satisfies Meta<typeof ErrorComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    error: sampleError('No se pudieron cargar las órdenes de compra.'),
    reset: () => {},
  },
}

export const EmptyMessage: Story = {
  args: {
    error: sampleError(''),
    reset: () => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          'An error with no message falls back to "Algo salió mal al cargar esta página."',
      },
    },
  },
}

export const WithComponentStack: Story = {
  args: {
    error: sampleError("Cannot read properties of undefined (reading 'map')"),
    info: {
      componentStack: `
    at DispatchOrdersTable (src/routes/purchase-orders/dispatch/-DispatchOrdersTable.tsx:31:3)
    at RouteComponent (src/routes/purchase-orders/dispatch/index.tsx:40:3)`,
    },
    reset: () => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          'A render error: the dev-only "Detalles técnicos" section shows both the error stack and the React component stack.',
      },
    },
  },
}

export const WithoutStack: Story = {
  args: {
    error: Object.assign(new Error('Tiempo de espera agotado.'), {
      stack: undefined,
    }),
    reset: () => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          'No stack and no component stack: the "Detalles técnicos" section is omitted.',
      },
    },
  },
}
