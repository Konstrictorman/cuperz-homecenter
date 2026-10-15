import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackProvider, useFeedback } from './FeedbackContext'
import type { RunMessages } from './FeedbackContext'

// `#/env` reads `import.meta.env`, which Jest's CommonJS runtime can't parse;
// the provider only reaches it transitively through `#/api/http`.
jest.mock('#/env', () => ({ env: {} }))

const MESSAGES: RunMessages = { success: 'Listo', error: 'Falló' }

/** Exposes the hook's actions as buttons driven by the given tasks. */
const Harness = ({ tasks }: { tasks: Array<() => Promise<unknown>> }) => {
  const feedback = useFeedback()
  return (
    <>
      {tasks.map((task, index) => (
        <button
          key={index}
          onClick={() => void feedback.run(task, MESSAGES)}
        >{`run ${index}`}</button>
      ))}
    </>
  )
}

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** MUI keeps the backdrop mounted after closing (fade-out, then
 *  `visibility: hidden`), so presence in the DOM isn't enough. */
const backdropVisible = () => {
  const backdrop = screen
    .queryByRole('progressbar', { hidden: true })
    ?.closest<HTMLElement>('.MuiBackdrop-root')
  return backdrop != null && backdrop.style.visibility !== 'hidden'
}

describe('FeedbackProvider', () => {
  it('shows the backdrop while running, then the success message', async () => {
    const user = userEvent.setup()
    const task = deferred()
    render(
      <FeedbackProvider>
        <Harness tasks={[() => task.promise]} />
      </FeedbackProvider>,
    )

    await user.click(screen.getByText('run 0'))
    expect(backdropVisible()).toBe(true)

    await act(async () => task.resolve())
    expect(await screen.findByText('Listo')).toBeInTheDocument()
  })

  it('makes the app inert while running', async () => {
    const user = userEvent.setup()
    const task = deferred()
    render(
      <FeedbackProvider>
        <Harness tasks={[() => task.promise]} />
      </FeedbackProvider>,
    )
    const trigger = screen.getByText('run 0')

    await user.click(trigger)
    expect(trigger.closest('[inert]')).not.toBeNull()

    await act(async () => task.resolve())
    expect(trigger.closest('[inert]')).toBeNull()
  })

  it('shows standalone info and warning messages', async () => {
    const user = userEvent.setup()
    const NotifyHarness = () => {
      const feedback = useFeedback()
      return (
        <>
          <button onClick={() => feedback.info('Aviso informativo')}>
            info
          </button>
          <button onClick={() => feedback.warning('Cuidado')}>warning</button>
        </>
      )
    }
    render(
      <FeedbackProvider>
        <NotifyHarness />
      </FeedbackProvider>,
    )

    await user.click(screen.getByText('info'))
    expect(await screen.findByRole('alert')).toHaveClass('MuiAlert-colorInfo')

    await user.click(screen.getByText('warning'))
    const alert = await screen.findByText('Cuidado')
    expect(alert.closest('.MuiAlert-root')).toHaveClass('MuiAlert-colorWarning')
  })

  it('falls back to the given error message for a non user-facing error', async () => {
    const user = userEvent.setup()
    render(
      <FeedbackProvider>
        <Harness
          tasks={[() => Promise.reject(new TypeError('Failed to fetch'))]}
        />
      </FeedbackProvider>,
    )

    await user.click(screen.getByText('run 0'))
    expect(await screen.findByText('Falló')).toBeInTheDocument()
  })

  it('keeps the backdrop up until every overlapping task finishes', async () => {
    const user = userEvent.setup()
    const first = deferred()
    const second = deferred()
    render(
      <FeedbackProvider>
        <Harness tasks={[() => first.promise, () => second.promise]} />
      </FeedbackProvider>,
    )

    await user.click(screen.getByText('run 0'))
    await user.click(screen.getByText('run 1'))
    await act(async () => first.resolve())
    expect(backdropVisible()).toBe(true)

    await act(async () => second.resolve())
    await waitFor(() => expect(backdropVisible()).toBe(false))
  })

  it('throws when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Harness tasks={[]} />)).toThrow(
      'useFeedback must be used within a FeedbackProvider',
    )
  })
})
