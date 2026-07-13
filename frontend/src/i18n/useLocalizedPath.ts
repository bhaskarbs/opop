import { useParams } from 'react-router-dom'
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './index'

/** Prefixes an absolute `ROUTES.x` path with the active `/:lang` segment, so links and
 * `navigate()` calls stay on the current locale instead of bouncing through LocaleRoot's
 * default-locale redirect (see App.tsx). */
export function useLocalizedPath() {
  const { lang } = useParams()
  const activeLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE
  return (path: string) => `/${activeLang}${path}`
}
