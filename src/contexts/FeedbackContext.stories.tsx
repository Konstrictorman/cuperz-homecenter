import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { FeedbackProvider, useFeedback } from './FeedbackContext'
import Button from '#/components/button/Button'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Buttons exercising every action `useFeedback()` exposes. */
const FeedbackDemo = () => {
  const feedback = useFeedback()

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 80 }}>
      <Button
        color="success"
        variant="contained"
        onClick={() => feedback.success('Operación completada.')}
      >
        success()
      </Button>
      <Button
        color="info"
        variant="contained"
        onClick={() => feedback.info('La descarga comenzará en breve.')}
      >
        info()
      </Button>
      <Button
        color="warning"
        variant="contained"
        onClick={() => feedback.warning('Algunas órdenes se omitieron.')}
      >
        warning()
      </Button>
      <Button
        color="error"
        variant="contained"
        onClick={() => feedback.error('No se pudo completar la operación.')}
      >
        error()
      </Button>
      <Button
        color="neutral"
        variant="outlined"
        onClick={() =>
          feedback.run(() => wait(1500), {
            success: 'Etiquetas generadas correctamente.',
            error: 'No se pudieron generar las etiquetas.',
          })
        }
      >
        run() — éxito
      </Button>
      <Button
        color="neutral"
        variant="outlined"
        onClick={() =>
          feedback.run(
            async () => {
              await wait(1500)
              throw new Error('El servidor rechazó la solicitud.')
            },
            {
              success: 'Etiquetas generadas correctamente.',
              error: 'No se pudieron generar las etiquetas.',
            },
          )
        }
      >
        run() — error
      </Button>
      <Button
        color="neutral"
        variant="outlined"
        onClick={() =>
          feedback.run(
            async () => {
              await wait(1500)
              // A TypeError (e.g. a network failure) is never shown verbatim.
              throw new TypeError('Failed to fetch')
            },
            {
              success: 'Archivo descargado.',
              error: 'No se pudo descargar el archivo.',
            },
          )
        }
      >
        run() — error de red
      </Button>
    </div>
  )
}

const meta = {
  title: 'Contexts/FeedbackProvider',
  component: FeedbackProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 240 },
      description: {
        component: `
App-wide outcome messages and blocking spinner: one \`FeedbackSnackbar\` and
one \`LoadingBackdrop\` for every page. Wrap the app in \`FeedbackProvider\`
and call \`useFeedback()\` from any component:

- \`success\` / \`info\` / \`warning\` / \`error(message)\` show the snackbar
  with that severity; a new message replaces the current one.
- \`run(task, { success, error })\` blocks the screen with the backdrop (and
  makes the app \`inert\`) while \`task\` runs, then reports the outcome. It
  never rejects. On failure it shows the backend's own message when there is
  one (\`ApiError.serverMessage\`) or a plain \`Error\`'s message, and falls
  back to \`messages.error\` for anything else — including \`TypeError\`
  network failures.
        `,
      },
    },
  },
} satisfies Meta<typeof FeedbackProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {
    children: <FeedbackDemo />,
  },
}
