import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { useState } from 'react'
import LoadingBackdrop from './LoadingBackdrop'
import Button from '#/components/button/Button'

const meta = {
  title: 'Components/LoadingBackdrop',
  component: LoadingBackdrop,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Full-screen, blocking spinner shown while a user-triggered request is in
flight. Controlled by \`open\`; it has no close affordance of its own — the
caller hides it when the request settles.

In the app it isn't rendered directly: \`FeedbackProvider\` owns the single
instance and shows it for the duration of every \`run()\` task (see
"Contexts/FeedbackProvider"). It sits above dialogs via
\`--z-loading-backdrop\`.
        `,
      },
    },
  },
} satisfies Meta<typeof LoadingBackdrop>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: { open: true },
  parameters: {
    docs: {
      // Inline, the fixed backdrop would cover the whole docs page.
      story: { inline: false, iframeHeight: 240 },
    },
  },
}

export const Closed: Story = {
  args: { open: false },
  parameters: {
    docs: {
      description: {
        story: '`open={false}`: nothing is rendered.',
      },
    },
  },
}

export const Interactive: Story = {
  args: { open: false },
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 240 },
      description: {
        story:
          'Simulates a 2-second request: the backdrop blocks the page until it finishes.',
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(false)

    const simulateRequest = () => {
      setOpen(true)
      setTimeout(() => setOpen(false), 2000)
    }

    return (
      <>
        <Button color="info" variant="contained" onClick={simulateRequest}>
          Simular petición
        </Button>
        <LoadingBackdrop open={open} />
      </>
    )
  },
}
