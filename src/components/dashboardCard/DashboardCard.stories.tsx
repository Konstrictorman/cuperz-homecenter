import type { Meta, StoryObj } from '@storybook/tanstack-react'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import LocalPostOfficeIcon from '@mui/icons-material/LocalPostOffice'
import DashboardCard from './DashboardCard'

const meta = {
  title: 'Components/DashboardCard',
  component: DashboardCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
KPI tile for the home dashboard: a bold \`title\`, a large \`highlight\` figure
(number or short string) with an optional MUI \`icon\` beside it, and a muted
\`description\` underneath (typically the time window the figure covers).

\`icon\` takes the icon **component** (e.g. \`PendingActionsIcon\`), not an
element. The card width and type scale step up at the 640px and 768px
breakpoints; in dark mode the icon and figure switch from Cuperz red to the
neutral foreground colour.
        `,
      },
    },
  },
  argTypes: {
    icon: { control: false },
  },
} satisfies Meta<typeof DashboardCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Órdenes de compra sin procesar',
    description: 'Últimas 24 horas',
    highlight: 7,
    icon: PendingActionsIcon,
  },
}

export const WithoutIcon: Story = {
  args: {
    title: 'Despachos sin procesar',
    description: 'Últimas 24 horas',
    highlight: 24,
  },
  parameters: {
    docs: {
      description: {
        story:
          'No `icon`: the figure sits alone in the row, still right-aligned.',
      },
    },
  },
}

export const StringHighlight: Story = {
  args: {
    title: 'Avisos de recibo',
    description: 'Última hora',
    highlight: '98%',
    icon: LocalPostOfficeIcon,
  },
  parameters: {
    docs: {
      description: {
        story:
          '`highlight` also accepts a string — e.g. a percentage or a formatted figure.',
      },
    },
  },
}

export const LargeNumber: Story = {
  args: {
    title: 'Productos despachados',
    description: 'Últimos 30 días',
    highlight: '12.480',
    icon: LocalShippingIcon,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A wide figure, to check it still fits the card alongside the icon.',
      },
    },
  },
}

export const Zero: Story = {
  args: {
    title: 'Errores de integración',
    description: 'Últimas 24 horas',
    highlight: 0,
    icon: PendingActionsIcon,
  },
  parameters: {
    docs: {
      description: {
        story: '`0` renders as a figure, not as an empty value.',
      },
    },
  },
}

export const Dashboard: Story = {
  args: {
    title: 'Órdenes de compra sin procesar',
    description: 'Últimas 24 horas',
    highlight: 7,
  },
  parameters: {
    docs: {
      description: {
        story: 'The three cards as laid out on the home page.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      <DashboardCard
        title="Órdenes de compra sin procesar"
        description="Últimas 24 horas"
        highlight={7}
        icon={PendingActionsIcon}
      />
      <DashboardCard
        title="Despachos sin procesar"
        description="Últimas 24 horas"
        highlight={24}
        icon={LocalShippingIcon}
      />
      <DashboardCard
        title="Avisos de recibo"
        description="Última hora"
        highlight={11}
        icon={LocalPostOfficeIcon}
      />
    </div>
  ),
}
