import { TextDecoder, TextEncoder } from 'node:util'
import '@testing-library/jest-dom'

// jsdom doesn't provide these globals; @tanstack/router-core's SSR
// streaming module reads them at import time even outside of SSR.
Object.assign(global, { TextEncoder, TextDecoder })

// This setup file also runs for `@jest-environment node` suites (the MSW
// handler tests), where there is no `window` and nothing below applies.
if (typeof globalThis.window !== 'undefined') {
  // jsdom doesn't implement scrolling; the router calls this on every
  // navigation for scroll restoration.
  window.scrollTo = () => {}

  // jsdom doesn't implement matchMedia; MUI's `useMediaQuery` and the
  // prefers-color-scheme detection in ThemeContext read it. Defaults to a
  // non-matching query (desktop / light); individual tests can override
  // `window.matchMedia` to simulate a matching breakpoint.
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
