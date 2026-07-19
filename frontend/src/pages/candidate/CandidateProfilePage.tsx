import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
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

const NAV_SECTIONS = [
  { labelKey: 'profile.nav.personalDetails', href: '#personal' },
  { labelKey: 'profile.nav.resume', href: '#resume' },
  { labelKey: 'profile.nav.skills', href: '#skills' },
  { labelKey: 'profile.nav.lifeGoals', href: '#goals' },
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

  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [skillsError, setSkillsError] = useState<string | null>(null)

  const [lifeGoals, setLifeGoals] = useState('')
  const [workCulture, setWorkCulture] = useState('')
  const [savingGoals, setSavingGoals] = useState(false)
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [savedGoals, setSavedGoals] = useState(false)

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
        setSkills(data.skills)
        setLifeGoals(data.lifeGoals ?? '')
        setWorkCulture(data.workCulture ?? '')
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
  }, [t])

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

  function addSkill(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const trimmed = newSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      persistSkills([...skills, trimmed])
    }
    setNewSkill('')
  }

  function removeSkill(skill: string) {
    persistSkills(skills.filter((s) => s !== skill))
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
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-[22px] font-bold text-white">
              {initial}
            </div>
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
            {skillsError && <p className="mb-3.5 text-[13px] text-danger">{skillsError}</p>}
            <div className="mb-3.5 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1.5 rounded-full bg-neutral-tint px-3.5 py-1.5 text-sm font-semibold text-[#3A414D]"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={t('profile.removeSkill', { skill })}
                    className="cursor-pointer text-fog"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              value={newSkill}
              onChange={(event) => setNewSkill(event.target.value)}
              onKeyDown={addSkill}
              placeholder={t('profile.addSkillPlaceholder')}
              className="w-full rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
          </Card>

          <Card id="goals" className="p-[26px]">
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
        </div>
      </div>
    </main>
  )
}
