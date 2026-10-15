import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import Header from './Header'
import { ThemeProvider } from '#/contexts/ThemeContext'

const meta = {
  title: 'Components/Header',
  component: Header,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
App header: the Cuperz logo, the \`MenuBar\` navigation, the light/dark
\`ThemeSwitch\` and the user avatar menu (Profile / My account / Logout —
placeholders until auth is wired).

It takes no props. It needs a \`ThemeProvider\` (from \`ThemeContext\`) above
it, which these stories add as a decorator. That provider is the real one, so
flipping the header's switch here does change the preview's \`data-theme\`
(and persists the choice to \`localStorage\`, as in the app) — the Storybook
toolbar toggle won't reflect it.
        `,
      },
    },
  },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OnPurchaseOrders: Story = {
  parameters: {
    tanstack: {
      router: { route: { path: '/purchase-orders/details' } },
    },
    docs: {
      description: {
        story:
          'On a `/purchase-orders/*` route: the "Órdenes de Compra" menu group is highlighted.',
      },
    },
  },
}

export const AvatarMenuOpen: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Clicks the avatar to open the user menu.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'avatar' }))

    // The menu is portalled to <body>, outside the story canvas, and fades
    // in — wait for the transition rather than asserting mid-animation.
    const body = within(canvasElement.ownerDocument.body)
    const logout = await body.findByRole('menuitem', { name: 'Logout' })
    await waitFor(() => expect(logout).toBeVisible())
  },
}
