import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export interface BackButtonProps {
  className?: string
}

/** Returns to the previous browser history entry (like the browser's own Back button) instead of
 * a fixed route, so whatever filters/search/tab state was on the page you came from survives
 * rather than resetting to that route's default view. Only used where the page is always reached
 * by clicking through from the place it returns to, so there's always a history entry to go back
 * to — not on pages that can be a tab's first entry (an emailed reset-password link, a 404 from a
 * bad/bookmarked URL), where history.back() could do nothing or leave the app. */
export function BackButton({ className }: BackButtonProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(-1)} className={className}>
      {t('back')}
    </button>
  )
}
