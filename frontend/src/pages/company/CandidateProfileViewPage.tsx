import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { API_BASE_URL, ApiError } from '../../lib/apiClient'
import { companyApi, type CandidateProfileForCompany } from '../../lib/companyApi'
import { experienceLevelFromBackend } from '../../lib/jobEnums'
import { ROUTES } from '../../routes/paths'

const EXPERIENCE_LEVEL_KEYS: Record<string, string> = {
  'Entry level': 'public:filters.experienceLevel.entry',
  'Mid level': 'public:filters.experienceLevel.mid',
  Senior: 'public:filters.experienceLevel.senior',
  Leadership: 'public:filters.experienceLevel.leadership',
}

const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

function colorForName(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Only a PDF can actually render inline in an <iframe> — a browser has no native viewer for
// .doc/.docx, so those only ever get the download action.
function isPreviewable(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf')
}

export default function CandidateProfileViewPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const { userId } = useParams()

  const [profile, setProfile] = useState<CandidateProfileForCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canContact, setCanContact] = useState(false)

  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    companyApi
      .getProfile()
      .then((company) =>
        setCanContact(company.profileComplete && company.verificationStatus === 'VERIFIED'),
      )
      .catch(() => setCanContact(false))
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    companyApi
      .getCandidateProfile(userId)
      .then((result) => {
        if (!cancelled) setProfile(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t('candidateProfile.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, t])

  useEffect(() => {
    return () => {
      if (resumeUrl) URL.revokeObjectURL(resumeUrl)
    }
  }, [resumeUrl])

  // Fetches (and caches) the resume blob once, on first use by either action — Download and
  // View both just reuse the same object URL afterward.
  async function ensureResumeLoaded(): Promise<string | null> {
    if (resumeUrl) return resumeUrl
    if (!userId) return null
    setResumeError(null)
    setResumeLoading(true)
    try {
      const blob = await companyApi.getCandidateResume(userId)
      const url = URL.createObjectURL(blob)
      setResumeUrl(url)
      return url
    } catch (caught) {
      setResumeError(
        caught instanceof ApiError ? caught.message : t('candidateProfile.resumeError'),
      )
      return null
    } finally {
      setResumeLoading(false)
    }
  }

  async function handleDownload() {
    if (!profile?.resumeFileName) return
    const url = await ensureResumeLoaded()
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = profile.resumeFileName
    link.click()
  }

  async function handleTogglePreview() {
    if (previewOpen) {
      setPreviewOpen(false)
      return
    }
    const url = await ensureResumeLoaded()
    if (url) setPreviewOpen(true)
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-7 pb-16 text-center text-sm text-slate">
        {t('candidateProfile.loading')}
      </main>
    )
  }

  if (error || !profile) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-7 pb-16 text-center text-sm text-danger">
        {error ?? t('candidateProfile.loadError')}
      </main>
    )
  }

  const meta = [profile.title, profile.location].filter(Boolean).join(' · ')

  return (
    <main className="mx-auto max-w-[760px] px-6 py-7 pb-16">
      <Link
        to={localize(ROUTES.companySearchCandidates)}
        className="mb-5 inline-block text-[13px] font-bold text-primary no-underline"
      >
        {t('candidateProfile.backToSearch')}
      </Link>

      {!canContact && (
        <div className="mb-4 rounded-lg border border-[#FCE3B8] bg-amber-tint px-4 py-3.5 text-[13px] text-[#8A5A0F]">
          {t('searchCandidates.contactDisabledHint')}
        </div>
      )}

      <div className="rounded-card border border-border bg-surface p-7">
        <div className="flex items-start gap-4">
          {profile.photoUrl ? (
            <img
              src={`${API_BASE_URL}${profile.photoUrl}`}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${colorForName(profile.fullName)}`}
            >
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-lg font-bold text-ink">{profile.fullName}</div>
            {meta && <div className="mt-0.5 text-sm text-slate">{meta}</div>}
            <div className="mt-0.5 text-[12px] text-fog">
              {t('candidateProfile.memberSince', { date: formatDate(profile.memberSince) })}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3.5 border-t border-[#F0F1F3] pt-4 sm:grid-cols-2">
          {profile.experienceLevel && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('public:filters.experienceLevel.heading')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">
                {t(EXPERIENCE_LEVEL_KEYS[experienceLevelFromBackend(profile.experienceLevel)])}
              </div>
            </div>
          )}
          {profile.industry && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('candidateProfile.industry')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">{profile.industry}</div>
            </div>
          )}
          {(profile.workModePreference || profile.openToPreference) && (
            <div>
              <div className="text-[12px] font-bold text-fog uppercase">
                {t('candidateProfile.preferences')}
              </div>
              <div className="mt-0.5 text-[13.5px] text-ink">
                {[profile.workModePreference, profile.openToPreference].filter(Boolean).join(' · ')}
              </div>
            </div>
          )}
        </div>

        {profile.skills.length > 0 && (
          <div className="mt-3.5 border-t border-[#F0F1F3] pt-4">
            <div className="mb-1.5 text-[12px] font-bold text-fog uppercase">
              {t('candidateProfile.skills')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-neutral-tint px-2.5 py-1 text-xs font-semibold text-[#3A414D]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-card border border-border bg-surface p-7">
        <h2 className="mb-3 text-base font-bold text-ink">{t('candidateProfile.resume')}</h2>

        {!profile.resumeFileName ? (
          <p className="text-[13px] text-slate">{t('candidateProfile.noResume')}</p>
        ) : (
          <>
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13.5px] font-bold text-ink">{profile.resumeFileName}</div>
                {profile.resumeUploadedAt && profile.resumeSizeBytes != null && (
                  <div className="mt-0.5 text-[12px] text-fog">
                    {t('candidateProfile.resumeMeta', {
                      date: formatDate(profile.resumeUploadedAt),
                      size: formatFileSize(profile.resumeSizeBytes),
                    })}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isPreviewable(profile.resumeFileName) && (
                  <button
                    type="button"
                    disabled={!canContact || resumeLoading}
                    onClick={handleTogglePreview}
                    title={canContact ? undefined : t('searchCandidates.contactDisabledHint')}
                    className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {previewOpen
                      ? t('candidateProfile.hidePreview')
                      : t('candidateProfile.viewResume')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canContact || resumeLoading}
                  onClick={handleDownload}
                  title={canContact ? undefined : t('searchCandidates.contactDisabledHint')}
                  className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resumeLoading
                    ? t('candidateProfile.resumeLoading')
                    : t('candidateProfile.downloadResume')}
                </button>
              </div>
            </div>

            {resumeError && <p className="mb-3 text-[13px] text-danger">{resumeError}</p>}

            {previewOpen && resumeUrl && (
              <iframe
                src={resumeUrl}
                title={profile.resumeFileName}
                className="h-[600px] w-full rounded-lg border border-border"
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
