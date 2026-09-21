import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckIcon from '@mui/icons-material/Check'
import ListChip from './ListChip'

const buildItems = (count: number) =>
  Array.from({ length: count }, (_, index) => `Item ${index}`)

describe('ListChip', () => {
  it.each([
    [0, '0'],
    [1, '1'],
    [9, '9'],
  ])('renders %i items with label "%s"', (count, expectedLabel) => {
    render(<ListChip items={buildItems(count)} />)

    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it.each([10, 15])('caps the label at "9+" for %i items', (count) => {
    render(<ListChip items={buildItems(count)} />)

    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('opens the popover, anchored to the chip, and shows each item when clicked', async () => {
    const user = userEvent.setup()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    render(<ListChip items={['Uno', 'Dos', 'Tres']} />)

    expect(screen.queryByText('Uno')).not.toBeInTheDocument()

    await user.click(screen.getByText('3'))

    expect(screen.getByText('Uno')).toBeInTheDocument()
    expect(screen.getByText('Dos')).toBeInTheDocument()
    expect(screen.getByText('Tres')).toBeInTheDocument()
    expect(document.querySelector('.MuiPopover-paper')).not.toBeNull()
    // MUI warns when `anchorEl` is missing/invalid — its absence confirms
    // the chip's own ref is what the popover actually anchors to.
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('anchorEl'),
    )
    warnSpy.mockRestore()
  })

  it('closes the popover when clicking outside it (its own invisible backdrop)', async () => {
    const user = userEvent.setup()
    render(<ListChip items={['Uno']} />)

    await user.click(screen.getByText('1'))
    expect(screen.getByText('Uno')).toBeInTheDocument()

    const backdrop = document.querySelector('.MuiBackdrop-root')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)

    // MUI's Popover keeps the content mounted until its exit transition
    // finishes; jsdom doesn't fire transitionend, so react-transition-group
    // falls back to its `timeout` prop via a real setTimeout.
    await waitFor(() => {
      expect(screen.queryByText('Uno')).not.toBeInTheDocument()
    })
  })

  it('closes the popover when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<ListChip items={['Uno']} />)

    await user.click(screen.getByText('1'))
    expect(screen.getByText('Uno')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByText('Uno')).not.toBeInTheDocument()
    })
  })

  it('renders a disabled chip when items is empty, and clicking it does nothing', () => {
    render(<ListChip items={[]} />)

    const chip = screen.getByText('0').closest('.MuiChip-root')
    expect(chip).toHaveClass('Mui-disabled')
    // MUI's disabled styling sets pointer-events: none, which is also why
    // userEvent (real pointer semantics) refuses to click it at all here —
    // fireEvent bypasses that check to confirm no onClick fires either.
    fireEvent.click(screen.getByText('0'))
    expect(
      screen.queryByText('No hay elementos para mostrar.'),
    ).not.toBeInTheDocument()
  })

  it("renders the item list inside a scrollable 'list-chip__list' container, capped at 240px wide", async () => {
    const user = userEvent.setup()
    render(<ListChip items={['Uno', 'Dos']} />)

    await user.click(screen.getByText('2'))

    expect(screen.getByText('Uno').closest('.list-chip__list')).not.toBeNull()
    expect(document.querySelector('.list-chip__popover')).not.toBeNull()
  })

  it('renders each item with the tightened line-height/padding classes', async () => {
    const user = userEvent.setup()
    render(<ListChip items={['Uno']} />)

    await user.click(screen.getByText('1'))

    expect(screen.getByText('Uno').closest('.list-chip__item')).not.toBeNull()
    expect(
      screen.getByText('Uno').closest('.list-chip__item-text'),
    ).not.toBeNull()
  })

  it('defaults to the "info" color when none is passed', () => {
    render(<ListChip items={['Uno']} />)

    const chip = screen.getByText('1').closest('.MuiChip-root')
    expect(chip).toHaveClass('MuiChip-colorInfo')
  })

  it('passes through other ChipProps such as icon, color, title, and className, overriding the "info" default', () => {
    render(
      <ListChip
        items={['Uno']}
        icon={<CheckIcon data-testid="chip-icon" />}
        color="primary"
        className="custom-class"
        title="Tooltip nativo"
      />,
    )

    const chip = screen.getByText('1').closest('.MuiChip-root')
    expect(screen.getByTestId('chip-icon')).toBeInTheDocument()
    expect(chip).toHaveClass('MuiChip-colorPrimary', 'custom-class')
    expect(chip).not.toHaveClass('MuiChip-colorInfo')
    // `title` is no longer owned by ListChip, so it passes through as the
    // ordinary native HTML tooltip attribute.
    expect(chip).toHaveAttribute('title', 'Tooltip nativo')
  })
})
