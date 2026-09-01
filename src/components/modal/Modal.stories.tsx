import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { useState } from 'react'
import Modal from './Modal'
import Button from '#/components/button/Button'

const meta = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Wraps MUI's \`Dialog\` with Cuperz's shared modal look: a themed
\`DialogTitle\` (with a built-in close button) and a themed \`DialogContent\`.

\`title\` renders inside \`DialogTitle\` and \`children\` renders inside
\`DialogContent\`. Visibility is controlled via \`onOpen\` (boolean) and
\`onClose\` fires both from the close button and from MUI's own backdrop/Esc
dismissal. Any other \`Dialog\` prop (\`fullWidth\`, \`maxWidth\`, etc.) is
passed straight through and can override the defaults
(\`fullWidth\`, \`maxWidth="lg"\`).

Styling comes from \`Modal.css\`, which themes the title bar and content
area from \`tokens.css\` and adapts to \`[data-theme="dark"]\`. This is the
same structure used by \`PurchaseOrderDetailModal\`.
        `,
      },
    },
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Detalle',
    onOpen: true,
    onClose: () => {},
    children: <p>Contenido del modal.</p>,
  },
}

export const Interactive: Story = {
  args: {
    title: 'Detalle OC 8467343',
    onOpen: false,
    onClose: () => {},
    children: <p>Contenido del modal.</p>,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A stateful example showing the modal opening from a button and closing via the close button, backdrop click, or Esc.',
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button color="info" variant="contained" onClick={() => setOpen(true)}>
          Abrir modal
        </Button>
        <Modal
          title="Detalle OC 8467343"
          onOpen={open}
          onClose={() => setOpen(false)}
        >
          <p>Contenido del modal.</p>
        </Modal>
      </>
    )
  },
}
