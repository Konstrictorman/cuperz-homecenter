import type { Meta, StoryObj } from '@storybook/tanstack-react'
import TruncatedText from './TruncatedText'

const meta = {
  title: 'Components/TruncatedText',
  component: TruncatedText,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Clamps \`text\` to \`lines\` (default \`1\`) with a CSS ellipsis, and shows the
full text in a tooltip — but only while it is actually overflowing. The
component always fills 100% of its parent's width, so every story below
wraps it in a fixed-width container to force (or avoid) truncation.

Resize the container (or the window) and the tooltip's enabled state
updates on its own, via a \`ResizeObserver\` — no remount needed.
        `,
      },
    },
  },
} satisfies Meta<typeof TruncatedText>

export default meta
type Story = StoryObj<typeof meta>

export const ShortText: Story = {
  args: {
    text: 'Texto corto',
  },
  render: (args) => (
    <div style={{ width: 240 }}>
      <TruncatedText {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Fits within its container: no ellipsis, and hovering shows no tooltip.',
      },
    },
  },
}

export const SingleLineTruncation: Story = {
  args: {
    text: 'Este es un texto bastante largo que no cabe en un contenedor angosto de una sola línea',
  },
  render: (args) => (
    <div style={{ width: 240 }}>
      <TruncatedText {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Default `lines={1}`: clipped to a single line with a CSS ellipsis. Hover to see the full text in a tooltip.',
      },
    },
  },
}

export const MultiLineTruncation: Story = {
  args: {
    text: 'Este es un párrafo mucho más largo, pensado para ocupar varias líneas antes de quedar recortado por el clamp de líneas configurado en el componente.',
    lines: 3,
  },
  render: (args) => (
    <div style={{ width: 240 }}>
      <TruncatedText {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '`lines={3}`: clipped to 3 lines instead of 1, still with a trailing ellipsis and the same hover tooltip behavior.',
      },
    },
  },
}
