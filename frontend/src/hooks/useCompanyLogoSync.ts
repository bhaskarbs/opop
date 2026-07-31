import { useEffect } from 'react'
import { useCompanyProfileStore } from '../stores/companyProfileStore'
import { useAuthStore } from '../stores/authStore'

/** Fetches the company's logo once when a layout needing the header's avatar mounts for a
 * company session — both AuthenticatedLayout and PublicLayout call this, since a company can
 * land on either first (e.g. straight to /jobs before ever visiting their dashboard/profile
 * page). Goes through companyProfileStore's cache-first fetchProfile (see there) rather than
 * calling companyApi.getProfile() directly, so this never triggers a network request if some
 * other company page already loaded the profile this session — and CompanyProfilePage keeps the
 * store in sync afterwards via setCompanyLogo directly (see there), so this never needs to run
 * again mid-session either. Mirrors useCandidatePhotoSync. */
export function useCompanyLogoSync(isCompany: boolean) {
  const companyLogoUrl = useAuthStore((state) => state.companyLogoUrl)
  const companyLogoVersion = useAuthStore((state) => state.companyLogoVersion)
  const setCompanyLogo = useAuthStore((state) => state.setCompanyLogo)
  const fetchProfile = useCompanyProfileStore((state) => state.fetchProfile)

  useEffect(() => {
    if (!isCompany) return
    let cancelled = false
    fetchProfile()
      .then((profile) => {
        if (!cancelled) setCompanyLogo(profile.logoUrl)
      })
      .catch(() => {
        // Best-effort — the header just falls back to initials if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [isCompany, setCompanyLogo, fetchProfile])

  return { companyLogoUrl, companyLogoVersion }
}
