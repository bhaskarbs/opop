import { create } from 'zustand'
import { savedJobsApi } from '../lib/savedJobsApi'
import type { JobSummary } from '../lib/jobsApi'

interface SavedJobsState {
  savedJobs: JobSummary[] | null
  loading: boolean
  error: string | null
  /** Cache-first, same pattern as applicationsStore.fetchApplications — save/unsave mutations
   * call this with force:true afterwards rather than patching the cache, since a save only ever
   * has the job's id on hand (not a full JobSummary to insert). */
  fetchSavedJobs: (force?: boolean) => Promise<JobSummary[]>
  clear: () => void
}

let inFlightFetch: Promise<JobSummary[]> | null = null

export const useSavedJobsStore = create<SavedJobsState>((set, get) => ({
  savedJobs: null,
  loading: false,
  error: null,
  fetchSavedJobs: (force = false) => {
    const { savedJobs } = get()
    if (savedJobs && !force) {
      return Promise.resolve(savedJobs)
    }
    if (inFlightFetch) {
      return inFlightFetch
    }
    set({ loading: true, error: null })
    inFlightFetch = savedJobsApi
      .mine()
      .then((data) => {
        set({ savedJobs: data, loading: false })
        return data
      })
      .catch((error: unknown) => {
        set({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load saved jobs',
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
    set({ savedJobs: null, loading: false, error: null })
  },
}))
