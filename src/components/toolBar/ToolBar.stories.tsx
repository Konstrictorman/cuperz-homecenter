import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { useState } from 'react'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import CloseIcon from '@mui/icons-material/Close'
import ToolBar from './ToolBar'
import Button from '#/components/button/Button'

const meta = {
  title: 'Components/ToolBar',
  component: ToolBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
A bulk-action bar that floats over the bottom of the screen, meant to pair
with selected rows in a \`DataTable\`. It has two sections separated by a
vertical divider: free-form \`text\` on the left (typically a selection
count), optionally followed by \`onSelectAll\` / \`onClearSelection\` buttons
that drive the table's selection (set \`selectionActionsIconOnly\` to render
them as \`DoneAll\` / \`RemoveDone\` icon buttons), and a row of \`actions\` on
the right,
each rendered as either a labeled \`Button\` or an icon-only \`IconButton\`
(set \`iconOnly\` on the action).

It behaves like a modal in that it can block interaction with the rest of
the page while it's open — controlled by \`blockInteraction\` (defaults to
\`true\`), which renders an invisible \`Backdrop\` beneath the bar. Set it to
\`false\` to let the underlying screen stay interactive while the toolbar
floats above it.

On mobile widths (\`max-width: 640px\`) the bar automatically collapses to
its icon-only layout — every action that has an \`icon\` and both selection
controls render as icon buttons regardless of \`iconOnly\` /
\`selectionActionsIconOnly\` — so the floating bar never overflows a phone
screen. Actions without an icon keep their label.

Corners are the shared \`--radius-lg\` (16px) token, matching \`Modal\`.
        `,
      },
    },
  },
} satisfies Meta<typeof ToolBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    open: true,
    text: '3 registros seleccionados',
    onSelectAll: () => {},
    onClearSelection: () => {},
    actions: [
      {
        key: 'export',
        label: 'Exportar',
        icon: <DownloadIcon fontSize="small" />,
        onClick: () => {},
      },
      {
        key: 'delete',
        label: 'Eliminar',
        color: 'error',
        icon: <DeleteIcon fontSize="small" />,
        onClick: () => {},
      },
    ],
  },
}

export const IconOnlyActions: Story = {
  args: {
    open: true,
    text: '5 órdenes seleccionadas',
    onSelectAll: () => {},
    onClearSelection: () => {},
    selectionActionsIconOnly: true,
    actions: [
      {
        key: 'download',
        label: 'Descargar',
        icon: <DownloadIcon fontSize="small" />,
        iconOnly: true,
        onClick: () => {},
      },
      {
        key: 'delete',
        label: 'Eliminar',
        icon: <DeleteIcon fontSize="small" />,
        iconOnly: true,
        color: 'error',
        onClick: () => {},
      },
      {
        key: 'close',
        label: 'Cerrar selección',
        icon: <CloseIcon fontSize="small" />,
        iconOnly: true,
        onClick: () => {},
      },
    ],
  },
}

export const Mobile: Story = {
  args: {
    open: true,
    text: '5 órdenes seleccionadas',
    onSelectAll: () => {},
    onClearSelection: () => {},
    actions: [
      {
        key: 'download',
        label: 'Descargar',
        icon: <DownloadIcon fontSize="small" />,
        onClick: () => {},
      },
      {
        key: 'delete',
        label: 'Eliminar',
        icon: <DeleteIcon fontSize="small" />,
        color: 'error',
        onClick: () => {},
      },
    ],
  },
  globals: {
    viewport: { value: 'phone', isRotated: false },
  },
  parameters: {
    viewport: {
      options: {
        phone: {
          name: 'Phone (360px)',
          styles: { width: '360px', height: '640px' },
        },
      },
    },
    docs: {
      description: {
        story:
          'At `max-width: 640px` the bar collapses to icons on its own — the `iconOnly` / `selectionActionsIconOnly` props are not set here. Widen the preview past ~640px to see the labeled layout return.',
      },
    },
  },
}

export const NonBlocking: Story = {
  args: {
    open: true,
    blockInteraction: false,
    text: '2 registros seleccionados',
    actions: [
      {
        key: 'export',
        label: 'Exportar',
        icon: <DownloadIcon fontSize="small" />,
        onClick: () => {},
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'With `blockInteraction={false}` no backdrop is rendered, so the rest of the screen (e.g. a table underneath) stays fully clickable while the toolbar floats.',
      },
    },
  },
}

export const Interactive: Story = {
  args: {
    open: false,
    text: '',
    actions: [],
  },
  parameters: {
    docs: {
      description: {
        story:
          'A stateful example: selecting rows would normally drive `open`/`text` — here a button simulates that toggle. Clicking an action closes the toolbar, like clearing the selection would.',
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(false)
    const [count, setCount] = useState(4)

    return (
      <>
        <Button color="info" variant="contained" onClick={() => setOpen(true)}>
          Simular selección de 4 filas
        </Button>
        <ToolBar
          open={open}
          text={`${count} registros seleccionados`}
          onSelectAll={() => setCount(10)}
          onClearSelection={() => setOpen(false)}
          actions={[
            {
              key: 'export',
              label: 'Exportar',
              icon: <DownloadIcon fontSize="small" />,
              onClick: () => setOpen(false),
            },
            {
              key: 'delete',
              label: 'Eliminar',
              color: 'error',
              icon: <DeleteIcon fontSize="small" />,
              onClick: () => setOpen(false),
            },
            {
              key: 'close',
              label: 'Cancelar selección',
              icon: <CloseIcon fontSize="small" />,
              iconOnly: true,
              onClick: () => setOpen(false),
            },
          ]}
        />
      </>
    )
  },
}
