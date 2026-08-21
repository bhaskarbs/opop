import { cn } from '../../lib/cn'

export interface LocationPinIconProps {
  className?: string
}

/** Small inline map-pin marker dropped in front of a job's location text (job search results,
 * job detail) — currentColor means it automatically matches whatever text color surrounds it. */
export function LocationPinIcon({ className }: LocationPinIconProps) {
  return (
    <svg
      className={cn('h-3.5 w-3.5 shrink-0', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
