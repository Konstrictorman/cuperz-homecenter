import type { Meta, StoryObj } from '@storybook/tanstack-react'
import NotFound from './NotFound'

const meta = {
  title: 'Components/NotFound',
  component: NotFound,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
The root route's \`notFoundComponent\`: shown when the URL matches no route.
It takes no props — the "Volver al panel principal" button navigates to \`/\`
through TanStack Router's \`useNavigate()\`.
        `,
      },
    },
  },
} satisfies Meta<typeof NotFound>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Mobile: Story = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  parameters: {
    docs: {
      description: {
        story: 'At phone width, to check the illustration scales down.',
      },
    },
  },
}
