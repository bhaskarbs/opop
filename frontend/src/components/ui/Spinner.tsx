import { cn } from '../../lib/cn'

export interface SpinnerProps {
  className?: string
}

/** Small inline loading indicator — dropped into a button (or anywhere else) alongside/instead
 * of its label while an async action is in flight. currentColor means it automatically matches
 * whatever text color the button already uses (white on a filled button, ink on an outline
 * one), so callers never need to set a color explicitly. */
export function Spinner({ className }: SpinnerProps) {
  return (
    <svg
      className={cn('h-4 w-4 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
