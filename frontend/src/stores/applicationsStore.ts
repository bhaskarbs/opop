import { create } from 'zustand'
import { applicationsApi, type ApplicationSummary } from '../lib/applicationsApi'

interface ApplicationsState {
  applications: ApplicationSummary[] | null
  loading: boolean
  error: string | null
  /** Cache-first, same pattern as candidateProfileStore.fetchProfile — concurrent callers (e.g.
   * JobSearchPage and CandidateDashboardPage mounting around the same time) share one in-flight
   * request instead of each firing their own GET /api/applications/mine. Unlike the profile
   * store, mutations here (apply/withdraw) can't just write their own response into the cache —
   * a single ApplicationSummary isn't the whole list — so they call this with force:true instead
   * (see applyAndRefresh in JobDetailPage) to repopulate it from the backend. */
  fetchApplications: (force?: boolean) => Promise<ApplicationSummary[]>
  clear: () => void
}

let inFlightFetch: Promise<ApplicationSummary[]> | null = null

export const useApplicationsStore = create<ApplicationsState>((set, get) => ({
  applications: null,
  loading: false,
  error: null,
  fetchApplications: (force = false) => {
    const { applications } = get()
    if (applications && !force) {
      return Promise.resolve(applications)
    }
    if (inFlightFetch) {
      return inFlightFetch
    }
    set({ loading: true, error: null })
    inFlightFetch = applicationsApi
      .mine()
      .then((data) => {
        set({ applications: data, loading: false })
        return data
      })
      .catch((error: unknown) => {
        set({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load applications',
        })
        throw error
      })
      .finally(() => {
        inFlightFetch = null
      })
    return inFlightFetch
  },
  clear: () => {
    inFlightFetch = null
    set({ applications: null, loading: false, error: null })
  },
}))
