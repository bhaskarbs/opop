import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn'

export type TagVariant = 'neutral' | 'primary' | 'partnership' | 'community'

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant
}

const variantClasses: Record<TagVariant, string> = {
  neutral: 'bg-neutral-tint text-slate',
  primary: 'bg-primary-tint text-primary',
  partnership: 'bg-amber-tint text-amber',
  community: 'bg-teal-tint text-teal',
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ variant = 'neutral', className, ...props }, ref) => {
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
Tag.displayName = 'Tag'
