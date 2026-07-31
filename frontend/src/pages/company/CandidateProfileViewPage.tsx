import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { useContactEligibility } from '../../hooks/useContactEligibility'
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

export default function CandidateProfileViewPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const { userId } = useParams()

  const [profile, setProfile] = useState<CandidateProfileForCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { canContact, hint: contactHint } = useContactEligibility()

  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)

  // The "view as web view" preview: the backend reads the resume file (.pdf/.docx/.doc)
  // server-side and hands back an HTML fragment, so this renders the same for every supported
  // file type — unlike dropping the raw file into an <iframe>, which only ever worked for PDFs.
  const [resumeHtml, setResumeHtml] = useState<string | null>(null)
  const [resumeHtmlLoading, setResumeHtmlLoading] = useState(false)
  const [resumeHtmlError, setResumeHtmlError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

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
    if (!resumeHtml && userId) {
      setResumeHtmlError(null)
      setResumeHtmlLoading(true)
      try {
        const result = await companyApi.getCandidateResumeHtml(userId)
        setResumeHtml(result.html)
      } catch (caught) {
        setResumeHtmlError(
          caught instanceof ApiError ? caught.message : t('candidateProfile.resumeError'),
        )
        return
      } finally {
        setResumeHtmlLoading(false)
      }
    }
    setPreviewOpen(true)
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

      {!canContact && contactHint && (
        <div className="mb-4 rounded-lg border border-[#FCE3B8] bg-amber-tint px-4 py-3.5 text-[13px] text-[#8A5A0F]">
          {contactHint}
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
                <button
                  type="button"
                  disabled={!canContact || resumeHtmlLoading}
                  onClick={handleTogglePreview}
                  title={canContact ? undefined : (contactHint ?? undefined)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resumeHtmlLoading && <Spinner className="h-3.5 w-3.5" />}
                  {resumeHtmlLoading
                    ? t('candidateProfile.resumeLoading')
                    : previewOpen
                      ? t('candidateProfile.hidePreview')
                      : t('candidateProfile.viewResume')}
                </button>
                <button
                  type="button"
                  disabled={!canContact || resumeLoading}
                  onClick={handleDownload}
                  title={canContact ? undefined : (contactHint ?? undefined)}
                  className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resumeLoading && <Spinner className="h-3.5 w-3.5" />}
                  {resumeLoading
                    ? t('candidateProfile.resumeLoading')
                    : t('candidateProfile.downloadResume')}
                </button>
              </div>
            </div>

            {resumeError && <p className="mb-3 text-[13px] text-danger">{resumeError}</p>}
            {resumeHtmlError && <p className="mb-3 text-[13px] text-danger">{resumeHtmlError}</p>}

            {previewOpen && resumeHtml && (
              <div
                className="max-h-[600px] overflow-y-auto rounded-lg border border-border p-5 text-[13.5px] text-ink [&_li]:mb-1 [&_p]:mb-2.5 [&_table]:my-2.5 [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_ul]:list-disc [&_ul]:pl-5"
                // Safe: resumeHtml comes from our own backend, which only ever emits a small
                // allow-listed set of tags (p/strong/em/u/li/ul/table/tr/td) and HTML-escapes
                // every piece of extracted resume text before wrapping it (see
                // ResumeHtmlRenderer) — never raw, unescaped file content.
                dangerouslySetInnerHTML={{ __html: resumeHtml }}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
