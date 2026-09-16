import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TruncatedText from './TruncatedText'

type Dimension = 'scrollWidth' | 'clientWidth' | 'scrollHeight' | 'clientHeight'

/**
 * jsdom has no real layout engine, so `scrollWidth`/`clientWidth`/
 * `scrollHeight`/`clientHeight` are always `0`. Stubbing them on
 * `HTMLElement.prototype` (restored in `afterEach`) lets each test control
 * whether the rendered element counts as overflowing before its mount
 * effect measures it.
 */
const stubDimensions = (values: Partial<Record<Dimension, number>>) => {
  const dimensions: Dimension[] = [
    'scrollWidth',
    'clientWidth',
    'scrollHeight',
    'clientHeight',
  ]
  for (const dimension of dimensions) {
    Object.defineProperty(HTMLElement.prototype, dimension, {
      configurable: true,
      value: values[dimension] ?? 0,
    })
  }
}

afterEach(() => {
  const dimensions: Dimension[] = [
    'scrollWidth',
    'clientWidth',
    'scrollHeight',
    'clientHeight',
  ]
  for (const dimension of dimensions) {
    Reflect.deleteProperty(HTMLElement.prototype, dimension)
  }
})

/**
 * Captures the `ResizeObserver` callback the component registers, so a test
 * can invoke it directly to simulate a resize without a real layout engine.
 */
class ResizeObserverMock implements ResizeObserver {
  static callbacks: ResizeObserverCallback[] = []

  constructor(callback: ResizeObserverCallback) {
    ResizeObserverMock.callbacks.push(callback)
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('TruncatedText', () => {
  it('renders the text unmodified when it fits within its container', () => {
    stubDimensions({ scrollWidth: 100, clientWidth: 100 })

    render(<TruncatedText text="Fits within its container" />)

    expect(
      screen.getByText('Fits within its container'),
    ).toBeInTheDocument()
  })

  it('clips to a single line with a CSS ellipsis by default when the text overflows horizontally', () => {
    stubDimensions({ scrollWidth: 300, clientWidth: 100 })

    render(<TruncatedText text="A very long line of text that overflows" />)

    const element = screen.getByText(
      'A very long line of text that overflows',
    )
    expect(element).toHaveClass('truncated-text', 'truncated-text--single-line')
    expect(element).not.toHaveClass('truncated-text--multi-line')
  })

  it('clips to N lines (not 1) when lines={N} and the text overflows vertically', () => {
    stubDimensions({ scrollHeight: 300, clientHeight: 100 })

    render(<TruncatedText text="A tall block of wrapped text" lines={3} />)

    const element = screen.getByText('A tall block of wrapped text')
    expect(element).toHaveClass('truncated-text', 'truncated-text--multi-line')
    expect(element).not.toHaveClass('truncated-text--single-line')
    expect(element.style.WebkitLineClamp).toBe('3')
  })

  it('shows a tooltip with the full text when hovering a truncated element', async () => {
    const user = userEvent.setup()
    stubDimensions({ scrollWidth: 300, clientWidth: 100 })

    render(<TruncatedText text="Truncated on hover" />)
    await user.hover(screen.getByText('Truncated on hover'))

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Truncated on hover',
    )
  })

  it('shows no tooltip when hovering an element that is not truncated', async () => {
    const user = userEvent.setup()
    stubDimensions({ scrollWidth: 100, clientWidth: 100 })

    render(<TruncatedText text="Not truncated" />)
    await user.hover(screen.getByText('Not truncated'))

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  // Not tested: "focusing a truncated element via keyboard reveals the
  // tooltip". The wrapped element has no `tabIndex`, so it isn't actually
  // keyboard-focusable — MUI `Tooltip` only opens on focus when its child is
  // `document.activeElement` (gated by `:focus-visible`), and nothing here
  // can become that without one. This is a real gap, not a jsdom
  // limitation: a keyboard user can't reach this element to trigger its
  // tooltip either. Deliberately left out of scope per spec decision (see
  // "Open items" in specs/03-truncated-text-component.md) rather than
  // faked with a manufactured `tabIndex` in the test alone.

  it('updates the tooltip state when the observed element resizes, without remounting', async () => {
    const user = userEvent.setup()
    const originalResizeObserver = window.ResizeObserver
    ResizeObserverMock.callbacks = []
    window.ResizeObserver = ResizeObserverMock

    try {
      stubDimensions({ scrollWidth: 100, clientWidth: 100 })
      render(<TruncatedText text="Grows to overflow" />)
      const element = screen.getByText('Grows to overflow')

      await user.hover(element)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      await user.unhover(element)

      stubDimensions({ scrollWidth: 200, clientWidth: 100 })
      act(() => {
        ResizeObserverMock.callbacks.forEach((callback) =>
          callback([], new ResizeObserverMock(() => {})),
        )
      })

      await user.hover(element)
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Grows to overflow',
      )
    } finally {
      window.ResizeObserver = originalResizeObserver
    }
  })
})
