import MuiButton from '@mui/material/Button'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'
import './Button.css'

export type ButtonColor = 'info' | 'success' | 'error' | 'warning'

export interface ButtonProps extends Omit<MuiButtonProps, 'color'> {
  color?: ButtonColor
}

const Button = ({ color = 'info', className, ...props }: ButtonProps) => {
  return (
    <MuiButton
      {...props}
      className={['button', `button--${color}`, className]
        .filter(Boolean)
        .join(' ')}
    />
  )
}

export default Button
