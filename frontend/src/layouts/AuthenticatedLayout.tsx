import { Outlet, useLocation } from 'react-router-dom'
import { Footer, Header, getActiveNavLabel, type HeaderVariant } from '../components/layout'

export interface AuthenticatedLayoutProps {
  /** 'candidate' | 'company' | 'admin' — 'guest' belongs to PublicLayout. */
  headerVariant: Exclude<HeaderVariant, 'guest'>
}

export default function AuthenticatedLayout({ headerVariant }: AuthenticatedLayoutProps) {
  const location = useLocation()
  const activeItem = getActiveNavLabel(headerVariant, location.pathname)

  return (
    <>
      <Header variant={headerVariant} activeItem={activeItem} />
      <Outlet />
      <Footer />
    </>
  )
}
