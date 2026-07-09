import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn'

export type BadgeVariant = 'success' | 'warning' | 'danger'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-teal-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger/10 text-danger',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'success', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold',
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    )
  },
)
Badge.displayName = 'Badge'
