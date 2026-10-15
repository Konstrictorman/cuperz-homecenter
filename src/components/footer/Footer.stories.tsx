import type { Meta, StoryObj } from '@storybook/tanstack-react'
import Footer from './Footer'

const meta = {
  title: 'Components/Footer',
  component: Footer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
App-wide footer with the "Powered By Cirkus" credit. It takes no props and is
\`position: fixed\` to the bottom of the viewport at \`--footer-height\`, so in
the docs page it pins to the bottom of the preview frame rather than flowing
inline.
        `,
      },
    },
  },
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const BelowPageContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Over scrolling page content: the footer stays fixed while the content scrolls beneath it.',
      },
    },
  },
  render: () => (
    <>
      <div style={{ padding: '1rem' }}>
        {Array.from({ length: 40 }, (_, i) => (
          <p key={i}>Línea de contenido {i + 1}</p>
        ))}
      </div>
      <Footer />
    </>
  ),
}
