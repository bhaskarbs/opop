import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn'
import { buttonClassNames, type ButtonSize, type ButtonVariant } from './buttonStyles'

export type { ButtonVariant, ButtonSize }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonClassNames(variant, size),
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
