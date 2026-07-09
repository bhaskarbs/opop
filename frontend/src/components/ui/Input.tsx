import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <div className="flex flex-col">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 text-[13px] font-bold text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-fog',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            error && 'border-danger focus:ring-danger',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
