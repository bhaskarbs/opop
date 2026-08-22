import { cn } from '../../lib/cn'

export interface SalaryIconProps {
  className?: string
}

/** Small inline wallet marker dropped in front of a job's salary — currentColor means it
 * automatically matches whatever text color surrounds it. */
export function SalaryIcon({ className }: SalaryIconProps) {
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
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}
