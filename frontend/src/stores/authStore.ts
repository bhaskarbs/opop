import { create } from 'zustand'
import type { UserSummary } from '../lib/apiClient'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthState {
  accessToken: string | null
  user: UserSummary | null
  /**
   * 'checking' while the initial silent refresh (via the httpOnly cookie, see App.tsx) is
   * in flight — route guards wait for this instead of redirecting immediately, so a real
   * session survives a hard page reload rather than bouncing straight to /login.
   */
  status: AuthStatus
  // Candidate-only, populated separately from `user` since login/session responses don't carry
  // it (see AuthenticatedLayout, which fetches it once, and CandidateProfilePage, which updates
  // it on upload) — kept here rather than page-local state so the header's avatar and the
  // profile page's avatar always show the same photo without needing a page reload.
  // candidatePhotoVersion is a cache-busting timestamp: candidatePhotoUrl is a stable path, so a
  // replacement photo wouldn't otherwise change the <img> src the browser/React see.
  candidatePhotoUrl: string | null
  candidatePhotoVersion: number
  // Company-only counterpart to the two fields above — same reasoning (see
  // useCompanyLogoSync and CompanyProfilePage, which updates this on upload).
  companyLogoUrl: string | null
  companyLogoVersion: number
  setSession: (accessToken: string, user: UserSummary) => void
  setCandidatePhoto: (photoUrl: string | null) => void
  setCompanyLogo: (logoUrl: string | null) => void
  clearSession: () => void
}

// Registered by main.tsx for each per-domain cache store (candidateProfileStore,
// companyProfileStore, applicationsStore, savedJobsStore) — see onSessionCleared below. Kept as
// a plain listener list rather than this store importing those directly: they (via their
// *Api.ts modules) import back into apiClient.ts, and apiClient.ts needs to call clearSession()
// itself on a failed background token refresh — a direct import here would be circular.
const sessionClearedListeners: Array<() => void> = []

/** Called once at startup (see main.tsx) for every per-domain cache store, so clearSession()
 * below — triggered by an explicit logout (Header.tsx), a failed silent-refresh on app load
 * (App.tsx), or a failed background token refresh (apiClient.ts, when the refresh cookie has
 * also expired) — always wipes every cache together. Without this, a next login in the same tab
 * (possibly as a different account) could see a previous session's cached profile/applications/
 * saved jobs. */
export function onSessionCleared(listener: () => void) {
  sessionClearedListeners.push(listener)
}

// Deliberately not persisted (no zustand `persist` middleware, no localStorage/sessionStorage) —
// the access token lives in memory only, per the architecture doc (Section 4.1), to limit
// exposure to XSS. A page reload loses it; the httpOnly refreshToken cookie re-establishes
// the session instead.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'checking',
  candidatePhotoUrl: null,
  candidatePhotoVersion: 0,
  companyLogoUrl: null,
  companyLogoVersion: 0,
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  setCandidatePhoto: (photoUrl) =>
    set({ candidatePhotoUrl: photoUrl, candidatePhotoVersion: Date.now() }),
  setCompanyLogo: (logoUrl) => set({ companyLogoUrl: logoUrl, companyLogoVersion: Date.now() }),
  clearSession: () => {
    set({
      accessToken: null,
      user: null,
      status: 'unauthenticated',
      candidatePhotoUrl: null,
      candidatePhotoVersion: 0,
      companyLogoUrl: null,
      companyLogoVersion: 0,
    })
    sessionClearedListeners.forEach((listener) => listener())
  },
}))
