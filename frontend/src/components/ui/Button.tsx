import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn'
import { buttonClassNames, type ButtonSize, type ButtonVariant } from './buttonStyles'
import { Spinner } from './Spinner'

export type { ButtonVariant, ButtonSize }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  // Forces disabled and swaps in a spinner ahead of the button's own children (rather than
  // replacing them) — callers still control the label/text themselves (e.g. "Saving…"), this
  // just adds the visual indicator so a disabled button doesn't look inert/broken.
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', className, loading = false, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          buttonClassNames(variant, size),
          'disabled:pointer-events-none disabled:opacity-50',
          loading && 'inline-flex items-center justify-center gap-2',
          className,
        )}
        {...props}
      >
        {loading && <Spinner className="h-4 w-4" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
