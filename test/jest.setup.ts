import { TextDecoder, TextEncoder } from 'node:util'
import '@testing-library/jest-dom'

// jsdom doesn't provide these globals; @tanstack/router-core's SSR
// streaming module reads them at import time even outside of SSR.
Object.assign(global, { TextEncoder, TextDecoder })

// jsdom doesn't implement scrolling; the router calls this on every
// navigation for scroll restoration.
window.scrollTo = () => {}
