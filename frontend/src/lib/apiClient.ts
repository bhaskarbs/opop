import { useAuthStore } from '../stores/authStore'

export type UserRole = 'CANDIDATE' | 'COMPANY' | 'ADMIN'

export interface UserSummary {
  id: string
  email: string
  fullName: string
  role: UserRole
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
  user: UserSummary
}

interface ApiErrorBody {
  message?: string
  details?: string[]
}

export class ApiError extends Error {
  status: number
  details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

// Exported so pages can build a full URL for a plain <img src> (relative paths like
// CandidateProfileResponse.photoUrl won't resolve on their own — the frontend dev server and
// backend run on different origins/ports).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

// Dev-only network-delay simulator — flip ENABLE_API_DELAY to true and reload to make every
// request/uploadRequest/blobRequest call below wait API_DELAY_MS before hitting the network, so
// loading states (spinners, skeletons, disabled buttons) are actually visible to work on
// instead of resolving instantly on localhost. Toggled by editing this constant, not at
// runtime — never enable it in a real deployment.
const ENABLE_API_DELAY = true
const API_DELAY_MS = 2000

function apiDelay(): Promise<void> {
  return ENABLE_API_DELAY
    ? new Promise((resolve) => setTimeout(resolve, API_DELAY_MS))
    : Promise.resolve()
}

let refreshPromise: Promise<string | null> | null = null

/** Dedupes concurrent refresh attempts — if several requests hit a 401 around the same moment
 * (e.g. a page firing several requests in parallel right as the access token expires), they all
 * await this same promise instead of each independently hitting /api/auth/refresh. Returns the
 * new access token on success, or null if the refresh itself failed — the httpOnly refresh
 * cookie is expired/invalid too, so the session is genuinely over, not just the access token. */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) return null
        const data = (await response.json()) as AuthResponse
        useAuthStore.getState().setSession(data.accessToken, data.user)
        return data.accessToken
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/** The in-memory access token (see authStore) only lives 15 minutes
 * (app.jwt.access-token-expiry-minutes) — every request below routes through here so a tab left
 * open longer than that transparently refreshes via the httpOnly refresh cookie and retries
 * once, instead of surfacing a stale-token 401 to whichever page happened to be open. Never
 * retries more than once, and never intercepts /api/auth/refresh's own call (which would
 * otherwise recurse forever). If the refresh itself fails — the refresh cookie has also expired,
 * or the session was ended elsewhere — the session is cleared so route guards redirect to login
 * instead of the app quietly re-failing every request from then on. */
async function fetchWithAuth(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: 'include' })
  if (response.status !== 401 || path === '/api/auth/refresh') {
    return response
  }
  const newToken = await refreshAccessToken()
  if (!newToken) {
    useAuthStore.getState().clearSession()
    return response
  }
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${newToken}`)
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' })
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    let details: string[] = []
    try {
      const body = (await response.json()) as ApiErrorBody
      message = body.message ?? message
      details = body.details ?? []
    } catch {
      // Body wasn't JSON (or was empty) — keep the generic message.
    }
    throw new ApiError(response.status, message, details)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

/** Shared by every API module (see jobsApi.ts) so base URL, credentials, and error parsing
 * stay consistent in one place. */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  await apiDelay()
  // fetchWithAuth sends/receives the httpOnly refreshToken cookie itself (required for
  // /refresh and /logout, since neither reads the token from anywhere JS can access), and
  // transparently refreshes+retries once on a 401 from an expired access token.
  const response = await fetchWithAuth(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  return handleResponse<T>(response)
}

/** Like request(), but for multipart/form-data uploads — deliberately doesn't set a
 * Content-Type header, so the browser fills in its own multipart boundary. */
export async function uploadRequest<T>(
  path: string,
  formData: FormData,
  headers: Record<string, string> = {},
): Promise<T> {
  await apiDelay()
  const response = await fetchWithAuth(path, {
    method: 'POST',
    headers,
    body: formData,
  })
  return handleResponse<T>(response)
}

/** For fetching a binary response (e.g. a mock interview recording) that needs an
 * Authorization header — unlike request(), a plain <video src> or <a href> can't attach one,
 * so callers fetch the bytes themselves and hand the resulting Blob to URL.createObjectURL. */
export async function blobRequest(
  path: string,
  headers: Record<string, string> = {},
): Promise<Blob> {
  await apiDelay()
  const response = await fetchWithAuth(path, { headers })
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`)
  }
  return response.blob()
}

export interface RegisterPayload {
  email: string
  password: string
  fullName: string
  role: 'candidate' | 'company'
  // Required by the backend when role is 'company' (verified by an admin — see Step 18);
  // ignored otherwise.
  entityType?: string
  cin?: string
  gstin?: string
  // Only meaningful when entityType is "Company Not Yet Registered" — substitutes for
  // cin/gstin as the identity check on a company that isn't formally registered yet.
  aadhaarNumber?: string
  pan?: string
  industry?: string
  address?: string
  signatoryName?: string
  contactNumber?: string
  // Required by the backend when role is 'candidate' (persisted to candidate_profiles);
  // ignored otherwise.
  mobile?: string
  skills?: string[]
  // Filename only — no file-storage service exists yet to hold the actual upload.
  resumeFileName?: string
}

export interface LoginPayload {
  email: string
  password: string
  // Email is unique per role, not globally (see backend User) — the same address can hold a
  // candidate account and a company account, so the backend needs to know which one to look up.
  role: 'candidate' | 'company' | 'admin'
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: LoginPayload) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  // Candidate-only: verifies the Google ID token server-side and logs in (or auto-registers
  // on first sign-in) — see AuthService.loginWithGoogle.
  loginWithGoogle: (idToken: string) =>
    request<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
  // Company-only counterpart — also auto-registers on first sign-in, but with a blank
  // verification profile (Google never supplies CIN/GSTIN/PAN/etc.); see
  // AuthService.loginWithGoogleAsCompany and CompanyProfilePage.
  loginWithGoogleAsCompany: (idToken: string) =>
    request<AuthResponse>('/api/auth/google/company', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
  refresh: () => request<AuthResponse>('/api/auth/refresh', { method: 'POST' }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  // Always resolves (backend responds 204 whether or not the email/role pair matches an
  // account) — see AuthService.requestPasswordReset. A rejection here means a genuine
  // delivery/network failure, not "no such account".
  forgotPassword: (payload: { email: string; role: 'candidate' | 'company' | 'admin' }) =>
    request<void>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    request<void>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
}
