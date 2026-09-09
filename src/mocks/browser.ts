import { setupWorker } from 'msw/browser'
import { handlers } from './handlers/registry'

export const worker = setupWorker(...handlers)
