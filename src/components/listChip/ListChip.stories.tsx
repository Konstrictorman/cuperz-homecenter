import type { Meta, StoryObj } from '@storybook/tanstack-react'
import ListAltIcon from '@mui/icons-material/ListAlt'
import ListChip from './ListChip'

const meta = {
  title: 'Components/ListChip',
  component: ListChip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Wraps MUI's \`Chip\` to summarize a \`string[]\`: the visible label is
\`items.length\` (capped at \`"9+"\` once there are more than 9), and clicking
the chip opens a \`Popover\` anchored right below it, with one row per item —
like a tooltip, but built for scrollable, interactive content, which a real
\`Tooltip\` isn't meant to hold.

There is no header and no close button — closing is a click outside the
popover or Escape (both built into \`Popover\`). Its backdrop is invisible by
default (that's \`Popover\`'s own behavior, not custom CSS), so the rest of
the screen never dims. The paper is capped at \`max-width: 240px\`, and item
rows use a tighter line-height/padding than a default \`List\` to fit that
width. The item list itself is separately capped at \`max-height: 50vh\` with
a vertical scrollbar past that, so a long list never grows the popover past
half the viewport height either.

When \`items\` is empty, the chip renders \`disabled\` (MUI's own disabled
style, including \`pointer-events: none\`) instead of opening an empty popover.

Every other \`Chip\` prop (\`icon\`, \`color\`, \`size\`, \`variant\`,
\`className\`, \`title\` — now just the native HTML tooltip, since \`ListChip\`
has no title concept of its own — …) passes straight through; only \`label\`,
\`onClick\`, and \`disabled\` are owned by \`ListChip\` itself. \`color\`
defaults to MUI's built-in \`"info"\` palette when not passed, same as the
\`color="info"\` \`Button\` used elsewhere in this app; pass your own \`color\`
to override it.
        `,
      },
    },
  },
} satisfies Meta<typeof ListChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: ['SKU-1023', 'SKU-1044', 'SKU-1187'],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Click the chip to open the popover and see the three SKUs, anchored right below it — narrow, header-less, tightly packed. Click outside it (or press Escape) to close.',
      },
    },
  },
}

export const WithIcon: Story = {
  args: {
    items: ['Tienda Bogotá Suba', 'Tienda Medellín Poblado'],
    icon: <ListAltIcon />,
  },
  parameters: {
    docs: {
      description: {
        story:
          "`icon` (like any other `ChipProps` prop besides `label`/`onClick`/`disabled`) passes straight through to MUI's `Chip`.",
      },
    },
  },
}

export const ColorOverride: Story = {
  args: {
    items: ['SKU-1023', 'SKU-1044'],
    color: 'secondary',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Passing `color` overrides the `"info"` default, exactly like any other `Chip` prop.',
      },
    },
  },
}

export const Empty: Story = {
  args: {
    items: [],
  },
  parameters: {
    docs: {
      description: {
        story:
          'An empty array renders the chip `disabled` — the label still shows "0", but there is nothing to click and no popover to open.',
      },
    },
  },
}

export const LongTexts: Story = {
  args: {
    items: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
      'Duis aute irure dolor in reprehenderit in voluptate velit.',
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'No truncation was requested, so long strings just wrap onto more lines inside the 240px-wide paper instead of being clipped.',
      },
    },
  },
}

export const ManyItems: Story = {
  args: {
    items: Array.from({ length: 14 }, (_, index) => `Tienda ${index + 1}`),
  },
  parameters: {
    docs: {
      description: {
        story:
          'More than 9 items caps the label at "9+". The popover itself still shows all 14, inside the 240px-wide, header-less paper, scrolling past half the viewport height.',
      },
    },
  },
}
