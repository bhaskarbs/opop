import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** React Router doesn't reset scroll position on navigation the way a full page load would —
 * without this, clicking a link while scrolled down a page lands the next page at that same
 * scroll offset instead of the top. Mounted once inside BrowserRouter (see App.tsx) so it
 * catches every route change app-wide. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
