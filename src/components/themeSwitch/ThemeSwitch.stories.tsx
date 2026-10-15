import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { useState } from 'react'
import Typography from '@mui/material/Typography'
import ThemeSwitch from './ThemeSwitch'

const meta = {
  title: 'Components/ThemeSwitch',
  component: ThemeSwitch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
MUI \`Switch\` restyled as a pill-shaped light/dark toggle: a white track when
unchecked (light) and a \`--cuperz-dark\` (#1F1F1F) track when checked (dark).
It accepts every \`Switch\` prop.

It is purely presentational — it doesn't change the theme by itself. The
\`Header\` wires \`checked\` / \`onChange\` to \`useTheme()\` from
\`ThemeContext\`.
        `,
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium'] },
  },
} satisfies Meta<typeof ThemeSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = {
  args: {
    checked: false,
    size: 'small',
    slotProps: { input: { 'aria-label': 'Tema oscuro' } },
  },
  parameters: {
    docs: {
      description: { story: 'Unchecked: the light theme is active.' },
    },
  },
}

export const Dark: Story = {
  args: {
    checked: true,
    size: 'small',
    slotProps: { input: { 'aria-label': 'Tema oscuro' } },
  },
  parameters: {
    docs: {
      description: { story: 'Checked: the dark theme is active.' },
    },
  },
}

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
    size: 'small',
    slotProps: { input: { 'aria-label': 'Tema oscuro' } },
  },
}

export const WithLabels: Story = {
  args: { size: 'small' },
  parameters: {
    docs: {
      description: {
        story:
          'Stateful, with the "Light" / "Dark" labels as laid out in the `Header`. Toggling here only flips the switch — use the toolbar theme toggle to change the preview theme.',
      },
    },
  },
  render: (args) => {
    const [checked, setChecked] = useState(false)

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Typography>Light</Typography>
        <ThemeSwitch
          {...args}
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          slotProps={{ input: { 'aria-label': 'Tema oscuro' } }}
        />
        <Typography>Dark</Typography>
      </div>
    )
  },
}
