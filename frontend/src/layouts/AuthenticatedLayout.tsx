import { Outlet, useLocation } from 'react-router-dom'
import { Footer, Header, getActiveNavLabel, type HeaderVariant } from '../components/layout'
import { useCandidatePhotoSync } from '../hooks/useCandidatePhotoSync'
import { useAuthStore } from '../stores/authStore'

export interface AuthenticatedLayoutProps {
  /** 'candidate' | 'company' | 'admin' — 'guest' belongs to PublicLayout. */
  headerVariant: Exclude<HeaderVariant, 'guest'>
}

export default function AuthenticatedLayout({ headerVariant }: AuthenticatedLayoutProps) {
  const location = useLocation()
  const activeItem = getActiveNavLabel(headerVariant, location.pathname)
  // Admin routes have no session yet (see App.tsx) — Header falls back to its mock default.
  const userName = useAuthStore((state) => state.user?.fullName)
  const { candidatePhotoUrl, candidatePhotoVersion } = useCandidatePhotoSync(
    headerVariant === 'candidate',
  )

  return (
    <>
      <Header
        variant={headerVariant}
        activeItem={activeItem}
        userName={userName}
        userPhotoUrl={candidatePhotoUrl}
        userPhotoVersion={candidatePhotoVersion}
      />
      <Outlet />
      <Footer />
    </>
  )
}
