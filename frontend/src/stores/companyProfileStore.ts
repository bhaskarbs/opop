import { create } from 'zustand'
import { companyApi, type CompanyProfileResponse } from '../lib/companyApi'

interface CompanyProfileState {
  profile: CompanyProfileResponse | null
  loading: boolean
  error: string | null
  /** Cache-first — mirrors candidateProfileStore.fetchProfile exactly. Concurrent callers (e.g.
   * useCompanyLogoSync firing from a layout at the same moment useContactEligibility or a
   * page's own effect requests it) share the same in-flight request rather than each firing
   * their own GET /api/company/profile. Pass force:true to bypass the cache. */
  fetchProfile: (force?: boolean) => Promise<CompanyProfileResponse>
  /** Called by every companyApi mutation that changes the profile (updateProfile directly;
   * uploadLogo and the certificate upload/delete endpoints indirectly, by merging just the
   * field they affect) once it succeeds, so the cache reflects the same data just written to
   * the backend rather than going stale until the next full refetch. */
  setProfile: (profile: CompanyProfileResponse) => void
  /** Called on logout so a next login (possibly as a different company) never sees a previous
   * session's cached profile. */
  clear: () => void
}

let inFlightFetch: Promise<CompanyProfileResponse> | null = null

export const useCompanyProfileStore = create<CompanyProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  fetchProfile: (force = false) => {
    const { profile } = get()
    if (profile && !force) {
      return Promise.resolve(profile)
    }
    if (inFlightFetch) {
      return inFlightFetch
    }
    set({ loading: true, error: null })
    inFlightFetch = companyApi
      .getProfile()
      .then((data) => {
        set({ profile: data, loading: false })
        return data
      })
      .catch((error: unknown) => {
        set({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load profile',
        })
        throw error
      })
      .finally(() => {
        inFlightFetch = null
      })
    return inFlightFetch
  },
  setProfile: (profile) => set({ profile }),
  clear: () => {
    inFlightFetch = null
    set({ profile: null, loading: false, error: null })
  },
}))
