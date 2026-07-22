import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, SkillsTagInput } from '../../components/ui'
import { ApiError, API_BASE_URL } from '../../lib/apiClient'
import { candidateApi, type CandidateProfileResponse } from '../../lib/candidateApi'
import {
  deriveCompletedSections,
  profileCompletionPercent,
} from '../../lib/candidateProfileCompletion'
import {
  EXPERIENCE_LEVELS,
  experienceLevelFromBackend,
  experienceLevelToBackend,
  type ExperienceLevelLabel,
} from '../../lib/jobEnums'
import { SKILL_SUGGESTIONS } from '../../mocks/skills'
import { useAuthStore } from '../../stores/authStore'

const NAV_SECTIONS = [
  { labelKey: 'profile.nav.personalDetails', href: '#personal' },
  { labelKey: 'profile.nav.resume', href: '#resume' },
  { labelKey: 'profile.nav.skills', href: '#skills' },
  { labelKey: 'profile.nav.lifeGoals', href: '#goals' },
  { labelKey: 'profile.nav.workPreferences', href: '#preferences' },
  { labelKey: 'profile.nav.accountSettings', href: '#account' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function CandidateProfilePage() {
  const { t, i18n } = useTranslation('candidate')

  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [title, setTitle] = useState('')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevelLabel | ''>('')
  const [industry, setIndustry] = useState('')
  const [mobile, setMobile] = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [personalError, setPersonalError] = useState<string | null>(null)
  const [savedPersonal, setSavedPersonal] = useState(false)

  const [resumeFileName, setResumeFileName] = useState<string | null>(null)
  const [resumeUploadedAt, setResumeUploadedAt] = useState<string | null>(null)
  const [resumeSizeBytes, setResumeSizeBytes] = useState<number | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  // Lives in the shared auth store (not page-local state) so the header's avatar and this
  // page's avatar always show the same photo, including immediately after an upload here —
  // see authStore.setCandidatePhoto and AuthenticatedLayout.
  const photoUrl = useAuthStore((state) => state.candidatePhotoUrl)
  const photoVersion = useAuthStore((state) => state.candidatePhotoVersion)
  const setCandidatePhoto = useAuthStore((state) => state.setCandidatePhoto)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [skills, setSkills] = useState<string[]>([])
  const [skillsError, setSkillsError] = useState<string | null>(null)

  const [lifeGoals, setLifeGoals] = useState('')
  const [workCulture, setWorkCulture] = useState('')
  const [savingGoals, setSavingGoals] = useState(false)
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [savedGoals, setSavedGoals] = useState(false)

  const [workMode, setWorkMode] = useState('Remote')
  const [openTo, setOpenTo] = useState('Jobs only')
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)
  const [savedPrefs, setSavedPrefs] = useState(false)

  useEffect(() => {
    let cancelled = false
    candidateApi
      .getProfile()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setFullName(data.fullName)
        setLocation(data.location ?? '')
        setTitle(data.title ?? '')
        setExperienceLevel(
          data.experienceLevel ? experienceLevelFromBackend(data.experienceLevel) : '',
        )
        setIndustry(data.industry ?? '')
        setMobile(data.mobile)
        setResumeFileName(data.resumeFileName)
        setResumeUploadedAt(data.resumeUploadedAt)
        setResumeSizeBytes(data.resumeSizeBytes)
        setCandidatePhoto(data.photoUrl)
        setSkills(data.skills)
        setLifeGoals(data.lifeGoals ?? '')
        setWorkCulture(data.workCulture ?? '')
        setWorkMode(data.workModePreference ?? 'Remote')
        setOpenTo(data.openToPreference ?? 'Jobs only')
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : t('profile.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t, setCandidatePhoto])

  async function handleSavePersonal() {
    setPersonalError(null)
    setSavingPersonal(true)
    try {
      const updated = await candidateApi.updatePersonalDetails({
        fullName,
        location,
        title,
        mobile,
        experienceLevel: experienceLevel ? experienceLevelToBackend(experienceLevel) : null,
        industry,
      })
      setProfile(updated)
      setSavedPersonal(true)
      setTimeout(() => setSavedPersonal(false), 2000)
    } catch (error) {
      setPersonalError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSavingPersonal(false)
    }
  }

  async function handleResumeChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setResumeError(null)
    try {
      const uploaded = await candidateApi.uploadResume(file)
      setResumeFileName(uploaded.resumeFileName)
      setResumeUploadedAt(uploaded.resumeUploadedAt)
      setResumeSizeBytes(uploaded.resumeSizeBytes)
    } catch (error) {
      setResumeError(error instanceof ApiError ? error.message : t('profile.saveError'))
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoError(null)
    setUploadingPhoto(true)
    try {
      const uploaded = await candidateApi.uploadPhoto(file)
      setCandidatePhoto(uploaded.photoUrl)
    } catch (error) {
      setPhotoError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function persistSkills(nextSkills: string[]) {
    const previous = skills
    setSkills(nextSkills)
    setSkillsError(null)
    try {
      const updated = await candidateApi.updateSkills(nextSkills)
      setSkills(updated.skills)
    } catch (error) {
      setSkills(previous)
      setSkillsError(error instanceof ApiError ? error.message : t('profile.saveError'))
    }
  }

  async function handleSaveGoals() {
    setGoalsError(null)
    setSavingGoals(true)
    try {
      const updated = await candidateApi.updateGoals({ lifeGoals, workCulture })
      setProfile(updated)
      setSavedGoals(true)
      setTimeout(() => setSavedGoals(false), 2000)
    } catch (error) {
      setGoalsError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSavingGoals(false)
    }
  }

  async function handleSavePrefs() {
    setPrefsError(null)
    setSavingPrefs(true)
    try {
      const updated = await candidateApi.updatePreferences({ workMode, openTo })
      setProfile(updated)
      setSavedPrefs(true)
      setTimeout(() => setSavedPrefs(false), 2000)
    } catch (error) {
      setPrefsError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSavingPrefs(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16 text-center text-sm text-slate">
        {t('profile.loading')}
      </main>
    )
  }

  if (loadError || !profile) {
    return (
      <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16 text-center text-sm text-danger">
        {loadError ?? t('profile.loadError')}
      </main>
    )
  }

  const completionPercent = profileCompletionPercent(deriveCompletedSections(profile))
  const initial = fullName.charAt(0).toUpperCase()

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16">
      <div className="profile:grid-cols-[240px_minmax(0,1fr)] grid grid-cols-1 gap-6">
        <aside className="profile:order-none order-first">
          <Card className="mb-4 p-[22px] text-center">
            <div className="relative mx-auto mb-3 h-16 w-16">
              {photoUrl ? (
                <img
                  src={`${API_BASE_URL}${photoUrl}?v=${photoVersion}`}
                  alt={fullName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-[22px] font-bold text-white">
                  {initial}
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label={t('profile.changePhoto')}
                className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-white disabled:opacity-60"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            {photoError && <p className="mb-2 text-[12.5px] text-danger">{photoError}</p>}
            <div className="text-base font-bold text-ink">{fullName}</div>
            <div className="mt-0.5 text-[13px] text-fog">
              {title || location ? `${title}${title && location ? ' · ' : ''}${location}` : null}
            </div>
            <div className="mt-4 mb-1.5 h-2 overflow-hidden rounded-full bg-neutral-tint">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="text-[12.5px] text-slate">
              {t('profile.percentComplete', { percent: completionPercent })}
            </div>
          </Card>
          <Card className="p-[18px]">
            {NAV_SECTIONS.map((section, index) => (
              <a
                key={section.labelKey}
                href={section.href}
                className={`mb-1 block rounded-lg px-3 py-2.5 text-sm font-semibold no-underline ${
                  index === 0 ? 'bg-primary-tint text-primary' : 'text-ink'
                }`}
              >
                {t(section.labelKey)}
              </a>
            ))}
          </Card>
        </aside>

        <div>
          <Card id="personal" className="mb-[18px] p-[26px]">
            <h2 className="mb-4 text-base font-bold text-ink">
              {t('profile.nav.personalDetails')}
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col">
                <label htmlFor="fullName" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('profile.fields.fullName')}
                </label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="location" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('profile.fields.location')}
                </label>
                <input
                  id="location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="email" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('profile.fields.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  title={t('profile.emailReadOnly')}
                  className="cursor-not-allowed rounded-control border border-border bg-neutral-tint px-3 py-2.5 text-sm text-fog"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="mobile" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('profile.fields.mobile')}
                </label>
                <input
                  id="mobile"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="experienceLevel" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('profile.fields.experienceLevel')}
                </label>
                <select
                  id="experienceLevel"
                  value={experienceLevel}
                  onChange={(event) =>
                    setExperienceLevel(event.target.value as ExperienceLevelLabel | '')
                  }
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                >
                  <option value="">{t('profile.fields.experienceLevelPlaceholder')}</option>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="industry" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('profile.fields.industry')}
                </label>
                <input
                  id="industry"
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  placeholder={t('profile.fields.industryPlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
            </div>
            {personalError && <p className="mt-3.5 text-[13px] text-danger">{personalError}</p>}
            <div className="mt-[18px] flex items-center gap-3">
              <Button type="button" onClick={handleSavePersonal} disabled={savingPersonal}>
                {t('profile.saveChanges')}
              </Button>
              {savedPersonal && (
                <span className="text-sm font-semibold text-teal">{t('profile.saved')}</span>
              )}
            </div>
          </Card>

          <Card id="resume" className="mb-[18px] p-[26px]">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">{t('profile.nav.resume')}</h2>
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-bold text-ink"
              >
                {t('profile.replace')}
              </button>
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleResumeChange}
              />
            </div>
            {resumeError && <p className="mb-3.5 text-[13px] text-danger">{resumeError}</p>}
            {resumeFileName ? (
              <div className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2451D6"
                  strokeWidth={1.8}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{resumeFileName}</div>
                  {resumeUploadedAt && resumeSizeBytes != null && (
                    <div className="text-xs text-fog">
                      {t('profile.resumeUploaded', {
                        uploaded: new Date(resumeUploadedAt).toLocaleDateString(i18n.language, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }),
                        size: formatFileSize(resumeSizeBytes),
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-fog">{t('profile.noResume')}</p>
            )}
          </Card>

          <Card id="skills" className="mb-[18px] p-[26px]">
            <h2 className="mb-1.5 text-base font-bold text-ink">{t('profile.nav.skills')}</h2>
            <p className="mb-3.5 text-[13px] text-fog">{t('profile.skillsBody')}</p>
            <SkillsTagInput
              value={skills}
              onChange={persistSkills}
              suggestions={SKILL_SUGGESTIONS}
              placeholder={t('profile.addSkillPlaceholder')}
              error={skillsError ?? undefined}
              removeSkillLabel={(skill) => t('profile.removeSkill', { skill })}
            />
          </Card>

          <Card id="goals" className="mb-[18px] p-[26px]">
            <h2 className="mb-1.5 text-base font-bold text-ink">{t('profile.nav.lifeGoals')}</h2>
            <p className="mb-3.5 text-[13px] text-fog">{t('profile.lifeGoalsBody')}</p>
            <textarea
              rows={3}
              value={lifeGoals}
              onChange={(event) => setLifeGoals(event.target.value)}
              placeholder={t('profile.lifeGoalsPlaceholder')}
              className="mb-3.5 w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
            <textarea
              rows={3}
              value={workCulture}
              onChange={(event) => setWorkCulture(event.target.value)}
              placeholder={t('profile.workCulturePlaceholder')}
              className="w-full resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
            {goalsError && <p className="mt-3.5 text-[13px] text-danger">{goalsError}</p>}
            <div className="mt-[18px] flex items-center gap-3">
              <Button type="button" onClick={handleSaveGoals} disabled={savingGoals}>
                {t('profile.saveChanges')}
              </Button>
              {savedGoals && (
                <span className="text-sm font-semibold text-teal">{t('profile.saved')}</span>
              )}
            </div>
          </Card>

          <Card id="preferences" className="p-[26px]">
            <h2 className="mb-1.5 text-base font-bold text-ink">
              {t('profile.nav.workPreferences')}
            </h2>
            <p className="mb-3.5 text-[13px] text-fog">{t('profile.workPreferencesBody')}</p>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col">
                <label htmlFor="workMode" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('public:filters.workMode.heading')}
                </label>
                <select
                  id="workMode"
                  value={workMode}
                  onChange={(event) => setWorkMode(event.target.value)}
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                >
                  <option value="Remote">{t('public:filters.workMode.remote')}</option>
                  <option value="Hybrid">{t('public:filters.workMode.hybrid')}</option>
                  <option value="On-site">{t('public:filters.workMode.onSite')}</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="openTo" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('addDetails.openTo')}
                </label>
                <select
                  id="openTo"
                  value={openTo}
                  onChange={(event) => setOpenTo(event.target.value)}
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                >
                  <option value="Jobs only">{t('addDetails.openToOptions.jobsOnly')}</option>
                  <option value="Jobs & partnerships">
                    {t('addDetails.openToOptions.jobsAndPartnerships')}
                  </option>
                  <option value="Jobs, partnerships & community roles">
                    {t('addDetails.openToOptions.jobsPartnershipsAndCommunity')}
                  </option>
                </select>
              </div>
            </div>
            {prefsError && <p className="mt-3.5 text-[13px] text-danger">{prefsError}</p>}
            <div className="mt-[18px] flex items-center gap-3">
              <Button type="button" onClick={handleSavePrefs} disabled={savingPrefs}>
                {t('profile.saveChanges')}
              </Button>
              {savedPrefs && (
                <span className="text-sm font-semibold text-teal">{t('profile.saved')}</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
