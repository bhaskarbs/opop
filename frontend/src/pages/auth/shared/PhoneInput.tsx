import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../../lib/cn'

export interface PhoneInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col">
        {label && <label className="mb-1.5 text-[13px] font-bold text-ink">{label}</label>}
        <div className="flex gap-2">
          <div className="flex items-center rounded-control border border-border px-3 text-sm text-slate">
            +91
          </div>
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            placeholder="98765 43210"
            className={cn(
              'min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      </div>
    )
  },
)
PhoneInput.displayName = 'PhoneInput'
