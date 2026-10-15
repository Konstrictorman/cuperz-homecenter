import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { useState } from 'react'
import type { AlertColor } from '@mui/material/Alert'
import FeedbackSnackbar, { CLOSED_FEEDBACK } from './FeedbackSnackbar'
import type { FeedbackSnackbarState } from './FeedbackSnackbar'
import Button from '#/components/button/Button'

const meta = {
  title: 'Components/FeedbackSnackbar',
  component: FeedbackSnackbar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      // The snackbar is fixed to the top of the viewport; render each story
      // in its own frame so they don't stack on top of each other.
      story: { inline: false, iframeHeight: 160 },
      description: {
        component: `
Top-centred, auto-hiding outcome message for a user action: an MUI
\`Snackbar\` wrapping an \`Alert\` of the given \`severity\`.

It hides itself after 6 seconds or when the ✕ is clicked — both call
\`onClose\`. Click-away is deliberately ignored: the click that triggers a new
message would otherwise dismiss it immediately.

In the app it isn't rendered directly: \`FeedbackProvider\` owns the single
instance and drives it through \`useFeedback()\` (see
"Contexts/FeedbackProvider"). \`CLOSED_FEEDBACK\` and
\`FeedbackSnackbarState\` are exported for callers that keep its state
themselves.
        `,
      },
    },
  },
  argTypes: {
    severity: {
      control: 'inline-radio',
      options: ['success', 'info', 'warning', 'error'],
    },
  },
} satisfies Meta<typeof FeedbackSnackbar>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    open: true,
    severity: 'success',
    message: 'Etiquetas generadas correctamente.',
    onClose: () => {},
  },
}

export const Info: Story = {
  args: {
    open: true,
    severity: 'info',
    message: 'La descarga comenzará en unos segundos.',
    onClose: () => {},
  },
}

export const Warning: Story = {
  args: {
    open: true,
    severity: 'warning',
    message: 'Algunas órdenes no tienen productos para despachar.',
    onClose: () => {},
  },
}

export const Error: Story = {
  args: {
    open: true,
    severity: 'error',
    message: 'No se pudo descargar el archivo. Intenta nuevamente.',
    onClose: () => {},
  },
}

export const LongMessage: Story = {
  args: {
    open: true,
    severity: 'error',
    message:
      'Homecenter rechazó el aviso de despacho: el contenedor C-000123 contiene productos sin peso ni volumen informados para la tienda 0412. Corrige los datos y vuelve a enviarlo.',
    onClose: () => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          'A long backend message, to check how the alert wraps at its maximum width.',
      },
    },
  },
}

const severities: Array<AlertColor> = ['success', 'info', 'warning', 'error']

export const Interactive: Story = {
  args: { ...CLOSED_FEEDBACK, onClose: () => {} },
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 240 },
      description: {
        story:
          'Trigger each severity. A new message replaces the current one and — because `key` changes — restarts the 6-second auto-hide, mirroring `FeedbackProvider`.',
      },
    },
  },
  render: () => {
    const [state, setState] = useState<FeedbackSnackbarState & { key: number }>(
      { ...CLOSED_FEEDBACK, key: 0 },
    )

    const show = (severity: AlertColor) =>
      setState((prev) => ({
        open: true,
        severity,
        message: `Mensaje de tipo "${severity}".`,
        key: prev.key + 1,
      }))

    return (
      <>
        <div style={{ display: 'flex', gap: 8, marginTop: 80 }}>
          {severities.map((severity) => (
            <Button
              key={severity}
              color={severity}
              variant="contained"
              onClick={() => show(severity)}
            >
              {severity}
            </Button>
          ))}
        </div>
        <FeedbackSnackbar
          key={state.key}
          open={state.open}
          message={state.message}
          severity={state.severity}
          onClose={() => setState((prev) => ({ ...prev, open: false }))}
        />
      </>
    )
  },
}
