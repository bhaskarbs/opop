import { cn } from '../../lib/cn'

export interface ExperienceIconProps {
  className?: string
}

/** Small inline briefcase marker dropped in front of a job's years-of-experience range —
 * currentColor means it automatically matches whatever text color surrounds it. */
export function ExperienceIcon({ className }: ExperienceIconProps) {
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
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
