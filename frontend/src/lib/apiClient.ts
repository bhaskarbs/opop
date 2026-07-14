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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    // Sends and receives the httpOnly refreshToken cookie — required for /refresh and
    // /logout to work, since neither reads the token from anywhere JS can access.
    credentials: 'include',
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  })
  return handleResponse<T>(response)
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
  pan?: string
  industry?: string
  address?: string
  signatoryName?: string
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
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: LoginPayload) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  // Candidate-only: verifies the Google ID token server-side and logs in (or auto-registers
  // on first sign-in) — see AuthService.loginWithGoogle.
  loginWithGoogle: (idToken: string) =>
    request<AuthResponse>('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  refresh: () => request<AuthResponse>('/api/auth/refresh', { method: 'POST' }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
}
