import { useAuthStore } from '../stores/authStore'
import { blobRequest, request, uploadRequest } from './apiClient'
import type { BackendExperienceLevel } from './jobsApi'

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface CompanyProfileResponse {
  companyName: string
  email: string
  // Null until the company fills these in (see CompanyProfilePage) — always null right after
  // Google sign-in, since Google never supplies CIN/GSTIN/PAN/etc.
  entityType: string | null
  cin: string | null
  gstin: string | null
  // Only meaningful when entityType is "Company Not Yet Registered" — substitutes for
  // cin/gstin as the identity check on a company that isn't formally registered yet.
  aadhaarNumber: string | null
  pan: string | null
  industry: string | null
  address: string | null
  signatoryName: string | null
  contactNumber: string | null
  verificationStatus: VerificationStatus
  // True once every field above is filled in. Posting jobs and (see SearchCandidatesPage)
  // contacting candidates both require this AND verificationStatus === 'VERIFIED'.
  profileComplete: boolean
  // Null until the company uploads a logo (see companyApi.uploadLogo) — same lazy-fill pattern
  // as CandidateProfileResponse.photoUrl.
  logoUrl: string | null
}

export interface LogoUploadResponse {
  logoUrl: string
}

// A verification document (certificate of incorporation, etc.) the company has on file — up
// to CERTIFICATE_LIMIT of these, fetched/managed separately from the profile itself (see
// companyApi.listCertificates/uploadCertificate/deleteCertificate). Shared by both
// CompanyRegisterPage and CompanyProfilePage, which call the same endpoints.
export interface CompanyCertificateSummary {
  id: string
  fileName: string
  uploadedAt: string
  sizeBytes: number
}

export const CERTIFICATE_LIMIT = 5

export interface UpdateCompanyProfilePayload {
  companyName: string
  entityType: string
  cin: string
  gstin: string
  aadhaarNumber: string
  pan: string
  industry: string
  address: string
  signatoryName: string
  contactNumber: string
}

export interface CandidateSearchSummary {
  userId: string
  fullName: string
  title: string | null
  location: string | null
  skills: string[]
  // Null until this company has clicked "View contact" for this candidate (see
  // revealCandidateContact) — once revealed, the backend keeps returning it on every later
  // search too, so it stays visible on a return visit instead of needing another click.
  contactNumber: string | null
}

export type CandidateSortOption = 'relevant' | 'newest' | 'name' | 'contacted'

export interface CandidateSearchParams {
  q?: string
  location?: string[]
  sort?: CandidateSortOption
}

export interface RevealCandidateContactResponse {
  contactNumber: string
}

export interface ResumeHtmlResponse {
  html: string
}

export type CompanySubscriptionPlanKey = 'FREE' | 'GROWTH' | 'ENTERPRISE'

// Backs the "N of M contacts remaining" gate on View contact/View profile — see
// CandidateSearchService.getContactQuota. periodEnd is null on Free (or a company that's never
// subscribed), since there's no active billing period to report.
export interface ContactQuota {
  plan: CompanySubscriptionPlanKey
  limit: number
  used: number
  remaining: number
  periodEnd: string | null
}

// Richer than CandidateSearchSummary (see backend CandidateProfileForCompany) — still no
// email/mobile up front, same boundary the search card already draws; resumeFileName is null
// until the candidate has uploaded one.
export interface CandidateProfileForCompany {
  userId: string
  fullName: string
  photoUrl: string | null
  title: string | null
  location: string | null
  experienceLevel: BackendExperienceLevel | null
  industry: string | null
  skills: string[]
  workModePreference: string | null
  openToPreference: string | null
  memberSince: string
  resumeFileName: string | null
  resumeUploadedAt: string | null
  resumeSizeBytes: number | null
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function buildQuery(params: CandidateSearchParams): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  params.location?.forEach((location) => search.append('location', location))
  if (params.sort) search.set('sort', params.sort)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const companyApi = {
  getProfile: () =>
    request<CompanyProfileResponse>('/api/company/profile', { headers: authHeaders() }),
  updateProfile: (payload: UpdateCompanyProfilePayload) =>
    request<CompanyProfileResponse>('/api/company/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  uploadLogo: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return uploadRequest<LogoUploadResponse>('/api/company/logo', formData, authHeaders())
  },
  listCertificates: () =>
    request<CompanyCertificateSummary[]>('/api/company/certificates', { headers: authHeaders() }),
  uploadCertificate: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return uploadRequest<CompanyCertificateSummary>(
      '/api/company/certificates',
      formData,
      authHeaders(),
    )
  },
  getCertificate: (id: string) => blobRequest(`/api/company/certificates/${id}`, authHeaders()),
  deleteCertificate: (id: string) =>
    request<void>(`/api/company/certificates/${id}`, { method: 'DELETE', headers: authHeaders() }),
  searchCandidates: (params: CandidateSearchParams = {}) =>
    request<CandidateSearchSummary[]>(`/api/company/candidates${buildQuery(params)}`, {
      headers: authHeaders(),
    }),
  revealCandidateContact: (userId: string) =>
    request<RevealCandidateContactResponse>(`/api/company/candidates/${userId}/reveal-contact`, {
      method: 'POST',
      headers: authHeaders(),
    }),
  getCandidateProfile: (userId: string) =>
    request<CandidateProfileForCompany>(`/api/company/candidates/${userId}`, {
      headers: authHeaders(),
    }),
  getContactQuota: () =>
    request<ContactQuota>('/api/company/candidates/contact-quota', { headers: authHeaders() }),
  // Same bytes regardless of the disposition query param the backend accepts — that header
  // only matters for a browser navigating to the URL directly, which can't happen here since
  // the endpoint requires a bearer token. Callers decide "download" vs "inline preview"
  // entirely client-side from this one Blob (see CandidateProfileViewPage).
  getCandidateResume: (userId: string) =>
    blobRequest(`/api/company/candidates/${userId}/resume`, authHeaders()),
  // Backend reads the resume file (.pdf/.docx/.doc) server-side and returns it as an HTML
  // fragment — used for the "view as web view" preview so non-PDF resumes render too, since a
  // browser can't display .docx/.doc natively the way it can drop a PDF into an <iframe>.
  getCandidateResumeHtml: (userId: string) =>
    request<ResumeHtmlResponse>(`/api/company/candidates/${userId}/resume/html`, {
      headers: authHeaders(),
    }),
}
