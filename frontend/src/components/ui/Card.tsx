import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle shadow on hover, for clickable/elevated cards. */
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-card border border-border bg-surface p-6',
          interactive && 'transition-shadow hover:shadow-elevated',
          className,
        )}
        {...props}
      />
    )
  },
)
Card.displayName = 'Card'

export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('text-h3 text-ink mb-1.5', className)} {...props} />
  },
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p ref={ref} className={cn('text-[13.5px] leading-[1.55] text-slate', className)} {...props} />
  )
})
CardDescription.displayName = 'CardDescription'
