import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'amber' | 'teal' | 'dark'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-surface text-ink border border-border hover:bg-page',
  ghost: 'bg-transparent text-ink hover:bg-page',
  amber: 'bg-amber text-white hover:bg-amber/90',
  teal: 'bg-teal text-white hover:bg-teal/90',
  dark: 'bg-ink text-white hover:bg-ink/90',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-[13px] text-base',
}

/** Shared class builder so `LinkButton` can render the same visual styles on an `<a>`. */
export function buttonClassNames(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(
    'inline-flex items-center justify-center rounded-control font-bold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    variantClasses[variant],
    sizeClasses[size],
  )
}
