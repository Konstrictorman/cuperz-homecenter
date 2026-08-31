import type { Meta, StoryObj } from '@storybook/tanstack-react'
import StatusBadge from './StatusBadge'

const meta = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['pending', 'dispatched', 'error', 'processing'],
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
    label: 'Error integración',
    tone: 'error',
  },
}

export const Processing: Story = {
  args: {
    label: 'Procesando',
    tone: 'processing',
  },
}

export const AllTones: Story = {
  args: {
    label: 'Pendiente despacho',
    tone: 'pending',
  },
  parameters: {
    docs: {
      description: {
        story:
          "Every tone side by side, matching the wireframe's four OC states.",
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <StatusBadge label="Pendiente despacho" tone="pending" />
      <StatusBadge label="Despachada" tone="dispatched" />
      <StatusBadge label="Error integración" tone="error" />
      <StatusBadge label="Procesando" tone="processing" />
    </div>
  ),
}
