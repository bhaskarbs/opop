import { Link } from 'react-router-dom'
import { Button } from '../components/ui'
import { ROUTES } from '../routes/paths'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col items-start px-6 py-24">
      <p className="text-h1 text-primary">404</p>
      <h1 className="text-h2 mt-2 text-ink">Page not found</h1>
      <p className="text-body mt-3 max-w-md text-slate">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to={ROUTES.home} className="mt-6">
        <Button>Back to home</Button>
      </Link>
    </main>
  )
}
