import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { userFacingErrorMessage } from '#/api/http'
import FeedbackSnackbar, {
  CLOSED_FEEDBACK,
} from '#/components/feedbackSnackbar/FeedbackSnackbar'
import type { FeedbackSnackbarState } from '#/components/feedbackSnackbar/FeedbackSnackbar'
import LoadingBackdrop from '#/components/loadingBackdrop/LoadingBackdrop'

export interface RunMessages {
  success: string
  /** Shown when the backend gave no user-facing message of its own — see
   *  `userFacingErrorMessage`. */
  error: string
}

interface FeedbackContextValue {
  success: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  error: (message: string) => void
  /** Blocks the screen with the backdrop while `task` runs, then reports the
   *  outcome in the snackbar. Never rejects — failures become the snackbar. */
  run: (task: () => Promise<unknown>, messages: RunMessages) => Promise<void>
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(
  undefined,
)

/**
 * App-wide outcome messages and blocking spinner: one snackbar and one
 * backdrop for every page. Only the (stable) actions go through context, so a
 * message showing up re-renders this provider, not every `useFeedback()`
 * consumer.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  // `key` changes per message so a replacing message restarts auto-hide.
  const [snackbar, setSnackbar] = useState<
    FeedbackSnackbarState & { key: number }
  >({ ...CLOSED_FEEDBACK, key: 0 })
  // A counter, not a flag: with overlapping tasks the first to finish must
  // not hide the backdrop while another is still running.
  const [pending, setPending] = useState(0)

  const show = useCallback(
    (severity: FeedbackSnackbarState['severity'], message: string) =>
      setSnackbar((prev) => ({
        open: true,
        severity,
        message,
        key: prev.key + 1,
      })),
    [],
  )

  const run = useCallback(
    async (task: () => Promise<unknown>, messages: RunMessages) => {
      setPending((count) => count + 1)
      try {
        await task()
        show('success', messages.success)
      } catch (taskError) {
        show('error', userFacingErrorMessage(taskError, messages.error))
      } finally {
        setPending((count) => count - 1)
      }
    },
    [show],
  )

  const value = useMemo<FeedbackContextValue>(
    () => ({
      success: (message) => show('success', message),
      info: (message) => show('info', message),
      warning: (message) => show('warning', message),
      error: (message) => show('error', message),
      run,
    }),
    [show, run],
  )

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <LoadingBackdrop open={pending > 0} />
      <FeedbackSnackbar
        key={snackbar.key}
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return context
}
