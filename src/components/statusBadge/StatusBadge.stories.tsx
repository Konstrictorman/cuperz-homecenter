import type { Meta, StoryObj } from '@storybook/tanstack-react'
import StatusBadge from './StatusBadge'
import type { OrderStatusType } from '#/routes/purchase-orders/types'

const meta = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: [
        'pending',
        'dispatched',
        'error',
        'processing',
        'cancelled',
        'received',
        'prepared',
        'unknown',
      ] as OrderStatusType[],
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
Colored status pill wrapping MUI's \`Chip\`. \`label\` is the exact text shown
(e.g. "Pendiente despacho", "Pendiente" on a line item) and \`tone\` picks the
color from a closed set that matches the wireframe's states — several labels
can share one tone (both "Pendiente despacho" and a line item's "Pendiente"
use \`tone="pending"\`).

Colors come straight from \`tokens.css\`'s \`--status-*\` / \`--color-grey-*\`
scales, which don't change with theme on their own — the component picks a
different step per theme itself (light: pale \`-100\` background with
\`-800\` text; dark: deep \`-900\` background with pale \`-200\` text) via
\`[data-theme="dark"]\` overrides in \`StatusBadge.css\`. Toggle the theme
toolbar above to see it switch.
        `,
      },
    },
  },
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = {
  args: {
    label: 'Pendiente despacho',
    tone: 'pending',
  },
}

export const Dispatched: Story = {
  args: {
    label: 'Despachada',
    tone: 'dispatched',
  },
}

export const Error: Story = {
  args: {
    label: 'Error',
    tone: 'error',
  },
}

export const Processing: Story = {
  args: {
    label: 'Procesando',
    tone: 'processing',
  },
}

export const Cancelled: Story = {
  args: {
    label: 'Cancelada',
    tone: 'cancelled',
  },
}

export const Received: Story = {
  args: {
    label: 'Recibida',
    tone: 'received',
  },
}

export const Prepared: Story = {
  args: {
    label: 'Preparada',
    tone: 'prepared',
  },
}

export const Unknown: Story = {
  args: {
    label: 'Desconocida',
    tone: 'unknown',
  },
  parameters: {
    docs: {
      description: {
        story:
          "Fallback for an `estado` the client doesn't recognise (see `orderStatusUi`), so the row still renders instead of crashing. Same colours as the `warning` Button.",
      },
    },
  },
}

export const AllTones: Story = {
  args: {
    label: 'Pendiente',
    tone: 'pending',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Every tone side by side, one per `OrderStatus` plus the `unknown` fallback.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <StatusBadge label="Pendiente" tone="pending" />
      <StatusBadge label="Despachada" tone="dispatched" />
      <StatusBadge label="Error" tone="error" />
      <StatusBadge label="Procesando" tone="processing" />
      <StatusBadge label="Cancelada" tone="cancelled" />
      <StatusBadge label="Recibida" tone="received" />
      <StatusBadge label="Preparada" tone="prepared" />
      <StatusBadge label="Desconocida" tone="unknown" />
    </div>
  ),
}
