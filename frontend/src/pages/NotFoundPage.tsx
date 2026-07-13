import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import { ROUTES } from '../routes/paths'

export default function NotFoundPage() {
  const { t } = useTranslation('public')
  const localize = useLocalizedPath()
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col items-start px-6 py-24">
      <p className="text-h1 text-primary">404</p>
      <h1 className="text-h2 mt-2 text-ink">{t('notFound.title')}</h1>
      <p className="text-body mt-3 max-w-md text-slate">{t('notFound.description')}</p>
      <Link to={localize(ROUTES.home)} className="mt-6">
        <Button>{t('notFound.backHome')}</Button>
      </Link>
    </main>
  )
}
