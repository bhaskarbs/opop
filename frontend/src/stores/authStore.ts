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
  setSession: (accessToken: string, user: UserSummary) => void
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
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  clearSession: () => set({ accessToken: null, user: null, status: 'unauthenticated' }),
}))
