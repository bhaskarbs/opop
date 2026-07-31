import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

export interface LoadingStateProps {
  message?: string
  className?: string
}

/** The one "this page/section is loading" visual across the app — a centered spinner with an
 * optional message underneath, replacing what used to be a bare line of text. Drop it in place
 * of {t('...loading')} wherever a page or list was just rendering that text directly; the
 * existing wrapper's spacing/max-width is left alone, only the plain-text child changes. */
export function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-2', className)}>
      <Spinner className="h-7 w-7 text-primary" />
      {message && <p className="text-sm text-slate">{message}</p>}
    </div>
  )
}
