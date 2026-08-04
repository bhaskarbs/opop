import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { analytics } from '../lib/analytics'

/** Same mounting pattern as ScrollToTop — a single instance inside BrowserRouter (see App.tsx)
 * fires a GA4 pageview on every route change, since this is an SPA and send_page_view only
 * fires once on init otherwise. A no-op when analytics isn't configured (see lib/analytics.ts). */
export function AnalyticsPageview() {
  const { pathname } = useLocation()

  useEffect(() => {
    analytics.pageview(pathname)
  }, [pathname])

  return null
}
