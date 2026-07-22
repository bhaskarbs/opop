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
  setSession: (accessToken: string, user: UserSummary) => void
  setCandidatePhoto: (photoUrl: string | null) => void
  clearSession: () => void
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
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  setCandidatePhoto: (photoUrl) =>
    set({ candidatePhotoUrl: photoUrl, candidatePhotoVersion: Date.now() }),
  clearSession: () =>
    set({
      accessToken: null,
      user: null,
      status: 'unauthenticated',
      candidatePhotoUrl: null,
      candidatePhotoVersion: 0,
    }),
}))
