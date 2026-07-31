import { create } from 'zustand'
import { candidateApi, type CandidateProfileResponse } from '../lib/candidateApi'

interface CandidateProfileState {
  profile: CandidateProfileResponse | null
  loading: boolean
  error: string | null
  /** Cache-first — returns the cached profile immediately without touching the network if
   * already loaded. Concurrent callers (e.g. useCandidatePhotoSync firing from a layout at the
   * same moment a page's own effect requests it) share the same in-flight request rather than
   * each firing their own GET /api/candidate/profile. Pass force:true to bypass the cache. */
  fetchProfile: (force?: boolean) => Promise<CandidateProfileResponse>
  /** Called by every candidateApi mutation (updatePersonalDetails, updateSkills, updateGoals,
   * updateMobile, updatePreferences, uploadPhoto, uploadResume) once it succeeds, so the cache
   * reflects the same data just written to the backend rather than going stale until the next
   * full refetch. */
  setProfile: (profile: CandidateProfileResponse) => void
  /** Called on logout so a next login (possibly as a different candidate) never sees a
   * previous session's cached profile. */
  clear: () => void
}

// Module-level rather than in the store's state — it's plumbing for fetchProfile's own
// deduping, not something any component should read or react to.
let inFlightFetch: Promise<CandidateProfileResponse> | null = null

export const useCandidateProfileStore = create<CandidateProfileState>((set, get) => ({
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
    inFlightFetch = candidateApi
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
