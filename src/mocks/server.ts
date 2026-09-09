import { setupServer } from 'msw/node'
import { handlers } from './handlers/registry'

// Used for SSR request interception and for Node-based tests.
export const server = setupServer(...handlers)
