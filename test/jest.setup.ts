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

  // jsdom doesn't implement ResizeObserver; TruncatedText observes its
  // container to re-check overflow after mount. This no-op stub is enough
  // for tests that don't assert resize behavior; a test that does can
  // override `window.ResizeObserver` locally (same pattern as the
  // `window.matchMedia` override in ToolBar.test.tsx) to capture and
  // trigger the callback itself.
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
