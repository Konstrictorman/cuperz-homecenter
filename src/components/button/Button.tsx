import MuiButton from '@mui/material/Button'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'
import clsx from 'clsx'

export type ButtonColor =
  'info' | 'success' | 'error' | 'warning' | 'default' | 'neutral'

export interface ButtonProps extends Omit<MuiButtonProps, 'color'> {
  color?: ButtonColor
}

const Button = ({ color = 'info', className, ...props }: ButtonProps) => {
  return (
    <MuiButton
      {...props}
      color={color}
      className={clsx('button', `button--${color}`, className)}
    />
  )
}

export default Button
