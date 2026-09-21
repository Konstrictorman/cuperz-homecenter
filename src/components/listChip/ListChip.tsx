import { useRef, useState } from 'react'
import MuiChip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip'
import Popover from '@mui/material/Popover'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import './ListChip.css'

export interface ListChipProps extends Omit<
  ChipProps,
  'label' | 'onClick' | 'disabled'
> {
  /** Strings rendered as the popover's list; the chip's label is derived from items.length. */
  items: string[]
}

const ListChip = ({ items, color = 'info', ...props }: ListChipProps) => {
  const chipRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const label = items.length > 9 ? '9+' : String(items.length)
  const hasItems = items.length > 0

  return (
    <>
      <MuiChip
        {...props}
        ref={chipRef}
        color={color}
        label={label}
        disabled={!hasItems}
        onClick={hasItems ? () => setOpen(true) : undefined}
      />
      <Popover
        open={open}
        anchorEl={chipRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { className: 'list-chip__popover' } }}
      >
        {hasItems ? (
          <List className="list-chip__list" dense disablePadding>
            {items.map((item, index) => (
              <ListItem
                key={`${item}-${index}`}
                className="list-chip__item"
                disableGutters
              >
                <ListItemText primary={item} className="list-chip__item-text" />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>No hay elementos para mostrar.</Typography>
        )}
      </Popover>
    </>
  )
}

export default ListChip
