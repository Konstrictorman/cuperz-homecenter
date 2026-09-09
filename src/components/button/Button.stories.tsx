import type { Meta, StoryObj } from '@storybook/tanstack-react'
import Button from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['info', 'success', 'error', 'warning'],
    },
    variant: {
      control: 'select',
      options: ['text', 'outlined', 'contained'],
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
Wraps MUI's \`Button\`, restricting \`color\` to a closed set of four
semantic variants: \`info\`, \`success\`, \`error\`, \`warning\`.

Colors come straight from the MUI theme's palette (\`src/theme/index.ts\`),
which carries both light and dark colour schemes, so this component needs
no dark-mode overrides of its own. \`text-transform: none\` /
\`text-decoration: none\` are applied to every button via the theme's
\`MuiButton\` style overrides. Toggle the theme toolbar above to see it
switch.

MUI's own \`variant\` (\`text\` / \`outlined\` / \`contained\`), \`size\`,
\`disabled\`, and other \`Button\` props are all still supported.
        `,
      },
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {
  args: {
    color: 'info',
    variant: 'contained',
    children: 'Info',
  },
}

export const Success: Story = {
  args: {
    color: 'success',
    variant: 'contained',
    children: 'Success',
  },
}

export const Error: Story = {
  args: {
    color: 'error',
    variant: 'contained',
    children: 'Error',
  },
}

export const Warning: Story = {
  args: {
    color: 'warning',
    variant: 'contained',
    children: 'Warning',
  },
}

export const AllVariants: Story = {
  args: {
    color: 'info',
    children: 'Button',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Every color across every MUI shape variant (text / outlined / contained).',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {(['text', 'outlined', 'contained'] as const).map((variant) => (
        <div key={variant} style={{ display: 'flex', gap: '0.5rem' }}>
          <Button color="info" variant={variant}>
            Info
          </Button>
          <Button color="success" variant={variant}>
            Success
          </Button>
          <Button color="error" variant={variant}>
            Error
          </Button>
          <Button color="warning" variant={variant}>
            Warning
          </Button>
        </div>
      ))}
    </div>
  ),
}
