import { useState } from 'react'
import MuiChip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip'
import type { ReactNode } from 'react'
import Modal from '#/components/modal/Modal'

export interface ListChipProps
  extends Omit<ChipProps, 'label' | 'onClick' | 'disabled' | 'title'> {
  /** Strings rendered as the modal's list; the chip's label is derived from items.length. */
  items: string[]
  /** Forwarded to Modal's `title`. */
  title: ReactNode
}

const ListChip = ({ items, title, ...props }: ListChipProps) => {
  const [open, setOpen] = useState(false)
  const label = items.length > 9 ? '9+' : String(items.length)
  const hasItems = items.length > 0

  return (
    <>
      <MuiChip
        {...props}
        label={label}
        disabled={!hasItems}
        onClick={hasItems ? () => setOpen(true) : undefined}
      />
      <Modal title={title} onOpen={open} onClose={() => setOpen(false)}>
        {/* Item list rendering lands in Step 3 */}
        {null}
      </Modal>
    </>
  )
}

export default ListChip
