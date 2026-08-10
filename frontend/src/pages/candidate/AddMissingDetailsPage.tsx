import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, LoadingState, SkillsTagInput } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import { candidateApi, type CandidateProfileResponse } from '../../lib/candidateApi'
import {
  deriveCompletedSections,
  profileCompletionPercent,
} from '../../lib/candidateProfileCompletion'
import {
  GENDERS,
  genderFromBackend,
  genderToBackend,
  type GenderLabel,
  MARITAL_STATUSES,
  maritalStatusFromBackend,
  maritalStatusToBackend,
  type MaritalStatusLabel,
  NOTICE_PERIODS,
  noticePeriodFromBackend,
  noticePeriodToBackend,
  type NoticePeriodLabel,
} from '../../lib/jobEnums'
import { PROFILE_CHECKLIST, type ChecklistKey } from '../../mocks/candidateProfile'
import { LANGUAGE_SUGGESTIONS } from '../../mocks/languages'
import { SKILL_SUGGESTIONS } from '../../mocks/skills'
import { ROUTES } from '../../routes/paths'
import { useCandidateProfileStore } from '../../stores/candidateProfileStore'

// Rendered text only — item.label (mocks/candidateProfile.ts) stays as the underlying data field.
const CHECKLIST_LABEL_KEYS: Record<ChecklistKey, string> = {
  personal: 'addDetails.checklist.personal',
  resume: 'addDetails.checklist.resume',
  skills: 'addDetails.checklist.skills',
  goals: 'addDetails.checklist.goals',
  mobile: 'addDetails.checklist.mobile',
  prefs: 'addDetails.checklist.prefs',
  background: 'addDetails.checklist.background',
}

// Matches CandidateProfilePage's parseOptionalNumber — numeric fields stay plain strings in
// component state here too (no React Hook Form on this page), parsed right before the API call.
function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function CheckIcon() {
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-teal">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

function SectionCard({
  title,
  description,
  done,
  children,
}: {
  title: string
  description: string
  done: boolean
  children: ReactNode
}) {
  const { t } = useTranslation('candidate')
  return (
    <div
      className={`relative mb-[18px] rounded-card p-[26px] ${
        done ? 'border border-border bg-surface opacity-60' : 'border-2 border-[#FCE3B8] bg-surface'
      }`}
    >
      <span
        className={`absolute top-5 right-[26px] rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${
          done ? 'bg-teal-tint text-teal' : 'bg-amber-tint text-amber'
        }`}
      >
        {done ? t('addDetails.complete') : t('addDetails.missing')}
      </span>
      <h2 className="mb-1.5 text-base font-bold text-ink">{title}</h2>
      <p className="mb-3.5 text-[13px] text-fog">{description}</p>
      {children}
    </div>
  )
}

export default function AddMissingDetailsPage() {
  const { t } = useTranslation('candidate')
  const localize = useLocalizedPath()

  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [location, setLocation] = useState('')
  const [title, setTitle] = useState('')
  const [gender, setGender] = useState<GenderLabel | ''>('')
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatusLabel | ''>('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [address, setAddress] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [personalError, setPersonalError] = useState<string | null>(null)

  const [skills, setSkills] = useState<string[]>([])
  const [skillsError, setSkillsError] = useState<string | null>(null)

  const [lifeGoals, setLifeGoals] = useState('')
  const [workCulture, setWorkCulture] = useState('')
  const [savingGoals, setSavingGoals] = useState(false)
  const [goalsError, setGoalsError] = useState<string | null>(null)

  const [mobile, setMobile] = useState('')
  const [savingMobile, setSavingMobile] = useState(false)
  const [mobileError, setMobileError] = useState<string | null>(null)

  const [workMode, setWorkMode] = useState('Remote')
  const [openTo, setOpenTo] = useState('Jobs only')
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  const [yearsOfExperience, setYearsOfExperience] = useState('')
  const [currentSalary, setCurrentSalary] = useState('')
  const [noticePeriod, setNoticePeriod] = useState<NoticePeriodLabel | ''>('')
  const [educationDegree, setEducationDegree] = useState('')
  const [educationInstitution, setEducationInstitution] = useState('')
  const [educationGraduationYear, setEducationGraduationYear] = useState('')
  const [savingBackground, setSavingBackground] = useState(false)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    useCandidateProfileStore
      .getState()
      .fetchProfile()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setLocation(data.location ?? '')
        setTitle(data.title ?? '')
        setGender(data.gender ? genderFromBackend(data.gender) : '')
        setMaritalStatus(data.maritalStatus ? maritalStatusFromBackend(data.maritalStatus) : '')
        setDateOfBirth(data.dateOfBirth ?? '')
        setAddress(data.address ?? '')
        setLanguages(data.languages)
        setSkills(data.skills)
        setLifeGoals(data.lifeGoals ?? '')
        setWorkCulture(data.workCulture ?? '')
        setMobile(data.mobile)
        setWorkMode(data.workModePreference ?? 'Remote')
        setOpenTo(data.openToPreference ?? 'Jobs only')
        setYearsOfExperience(data.yearsOfExperience != null ? String(data.yearsOfExperience) : '')
        setCurrentSalary(data.currentSalaryLakhs != null ? String(data.currentSalaryLakhs) : '')
        setNoticePeriod(data.noticePeriod ? noticePeriodFromBackend(data.noticePeriod) : '')
        setEducationDegree(data.educationDegree ?? '')
        setEducationInstitution(data.educationInstitution ?? '')
        setEducationGraduationYear(
          data.educationGraduationYear != null ? String(data.educationGraduationYear) : '',
        )
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

  async function savePersonal() {
    if (!profile) return
    setPersonalError(null)
    setSavingPersonal(true)
    try {
      const updated = await candidateApi.updatePersonalDetails({
        fullName: profile.fullName,
        location,
        title,
        mobile: profile.mobile,
        experienceLevel: profile.experienceLevel,
        industry: profile.industry ?? '',
        gender: gender ? genderToBackend(gender) : null,
        maritalStatus: maritalStatus ? maritalStatusToBackend(maritalStatus) : null,
        dateOfBirth: dateOfBirth || null,
        address: address || null,
        languages,
      })
      setProfile(updated)
      useCandidateProfileStore.getState().setProfile(updated)
    } catch (error) {
      setPersonalError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSavingPersonal(false)
    }
  }

  async function persistSkills(nextSkills: string[]) {
    const previous = skills
    setSkills(nextSkills)
    setSkillsError(null)
    try {
      const updated = await candidateApi.updateSkills(nextSkills)
      setSkills(updated.skills)
      setProfile(updated)
      useCandidateProfileStore.getState().setProfile(updated)
    } catch (error) {
      setSkills(previous)
      setSkillsError(error instanceof ApiError ? error.message : t('profile.saveError'))
    }
  }

  async function saveGoals() {
    setGoalsError(null)
    setSavingGoals(true)
    try {
      const updated = await candidateApi.updateGoals({ lifeGoals, workCulture })
      setProfile(updated)
      useCandidateProfileStore.getState().setProfile(updated)
    } catch (error) {
      setGoalsError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSavingGoals(false)
    }
  }

  async function saveMobile() {
    setMobileError(null)
    setSavingMobile(true)
    try {
      const updated = await candidateApi.updateMobile(mobile)
      setProfile(updated)
      useCandidateProfileStore.getState().setProfile(updated)
    } catch (error) {
      setMobileError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSavingMobile(false)
    }
  }

  async function savePrefs() {
    setPrefsError(null)
    setSavingPrefs(true)
    try {
      const updated = await candidateApi.updatePreferences({ workMode, openTo })
      setProfile(updated)
      useCandidateProfileStore.getState().setProfile(updated)
    } catch (error) {
      setPrefsError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSavingPrefs(false)
    }
  }

  async function saveBackground() {
    setBackgroundError(null)
    setSavingBackground(true)
    try {
      const updated = await candidateApi.updateBackground({
        yearsOfExperience: parseOptionalNumber(yearsOfExperience),
        currentSalaryLakhs: parseOptionalNumber(currentSalary),
        noticePeriod: noticePeriod ? noticePeriodToBackend(noticePeriod) : null,
        educationDegree: educationDegree || null,
        educationInstitution: educationInstitution || null,
        educationGraduationYear: parseOptionalNumber(educationGraduationYear),
      })
      setProfile(updated)
      useCandidateProfileStore.getState().setProfile(updated)
    } catch (error) {
      setBackgroundError(error instanceof ApiError ? error.message : t('profile.saveError'))
    } finally {
      setSavingBackground(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16">
        <LoadingState message={t('profile.loading')} />
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

  const completed = deriveCompletedSections(profile)
  const completionPercent = profileCompletionPercent(completed)

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16">
      <div className="profile:grid-cols-[260px_minmax(0,1fr)] grid grid-cols-1 gap-6">
        <aside className="profile:order-none order-first">
          <div className="sticky top-[88px] rounded-card border border-border bg-surface p-[22px]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">{t('dashboard.profileStrength')}</span>
              <span className="text-[13px] font-bold text-primary">{completionPercent}%</span>
            </div>
            <div className="mb-[18px] h-2 overflow-hidden rounded-full bg-neutral-tint">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="mb-3 text-[12.5px] font-bold tracking-[0.04em] text-fog uppercase">
              {t('addDetails.stillMissing')}
            </div>
            {PROFILE_CHECKLIST.map((item) => {
              const done = completed[item.key]
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-2.5 border-t border-[#F0F1F3] py-2.5"
                >
                  {done ? (
                    <CheckIcon />
                  ) : (
                    <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-[#D7DBE2]" />
                  )}
                  <span className={`text-[13.5px] font-semibold ${done ? 'text-fog' : 'text-ink'}`}>
                    {t(CHECKLIST_LABEL_KEYS[item.key])}
                  </span>
                </div>
              )
            })}
          </div>
        </aside>

        <div>
          <h1 className="mb-1 text-xl font-extrabold text-ink">{t('addDetails.title')}</h1>
          <p className="mb-6 text-sm text-slate">{t('addDetails.subtitle')}</p>

          <SectionCard
            title={t('addDetails.checklist.personal')}
            description={t('addDetails.personalDescription')}
            done={completed.personal}
          >
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-location"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.location')}
                </label>
                <input
                  id="add-details-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-title"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.title')}
                </label>
                <input
                  id="add-details-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('profile.fields.titlePlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-gender"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.gender')}
                </label>
                <select
                  id="add-details-gender"
                  value={gender}
                  onChange={(event) => setGender(event.target.value as GenderLabel | '')}
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                >
                  <option value="">{t('profile.fields.genderPlaceholder')}</option>
                  {GENDERS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-marital-status"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.maritalStatus')}
                </label>
                <select
                  id="add-details-marital-status"
                  value={maritalStatus}
                  onChange={(event) =>
                    setMaritalStatus(event.target.value as MaritalStatusLabel | '')
                  }
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                >
                  <option value="">{t('profile.fields.maritalStatusPlaceholder')}</option>
                  {MARITAL_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="add-details-dob" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('profile.fields.dateOfBirth')}
                </label>
                <input
                  id="add-details-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label
                  htmlFor="add-details-address"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.address')}
                </label>
                <textarea
                  id="add-details-address"
                  rows={2}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={t('profile.fields.addressPlaceholder')}
                  className="resize-y rounded-control border border-border px-3 py-2.5 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <span className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('profile.fields.languages')}
                </span>
                <SkillsTagInput
                  value={languages}
                  onChange={setLanguages}
                  suggestions={LANGUAGE_SUGGESTIONS}
                  placeholder={t('profile.fields.languagesPlaceholder')}
                  removeSkillLabel={(language) => t('profile.removeLanguage', { language })}
                />
              </div>
            </div>
            {personalError && <p className="mb-3.5 text-[13px] text-danger">{personalError}</p>}
            <Button type="button" onClick={savePersonal} loading={savingPersonal}>
              {t('addDetails.save')}
            </Button>
          </SectionCard>

          <SectionCard
            title={t('addDetails.checklist.background')}
            description={t('addDetails.backgroundDescription')}
            done={completed.background}
          >
            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-years-of-experience"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.yearsOfExperience')}
                </label>
                <input
                  id="add-details-years-of-experience"
                  type="number"
                  min={0}
                  step={0.5}
                  value={yearsOfExperience}
                  onChange={(event) => setYearsOfExperience(event.target.value)}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-current-salary"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.currentSalary')}
                </label>
                <input
                  id="add-details-current-salary"
                  type="number"
                  min={0}
                  step={0.5}
                  value={currentSalary}
                  onChange={(event) => setCurrentSalary(event.target.value)}
                  placeholder={t('profile.fields.currentSalaryPlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-notice-period"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.noticePeriod')}
                </label>
                <select
                  id="add-details-notice-period"
                  value={noticePeriod}
                  onChange={(event) =>
                    setNoticePeriod(event.target.value as NoticePeriodLabel | '')
                  }
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                >
                  <option value="">{t('profile.fields.noticePeriodPlaceholder')}</option>
                  {NOTICE_PERIODS.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-education-degree"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.educationDegree')}
                </label>
                <input
                  id="add-details-education-degree"
                  value={educationDegree}
                  onChange={(event) => setEducationDegree(event.target.value)}
                  placeholder={t('profile.fields.educationDegreePlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-education-institution"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.educationInstitution')}
                </label>
                <input
                  id="add-details-education-institution"
                  value={educationInstitution}
                  onChange={(event) => setEducationInstitution(event.target.value)}
                  placeholder={t('profile.fields.educationInstitutionPlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="add-details-education-graduation-year"
                  className="mb-1.5 text-[13px] font-bold text-ink"
                >
                  {t('profile.fields.educationGraduationYear')}
                </label>
                <input
                  id="add-details-education-graduation-year"
                  type="number"
                  min={1950}
                  max={2100}
                  step={1}
                  value={educationGraduationYear}
                  onChange={(event) => setEducationGraduationYear(event.target.value)}
                  placeholder={t('profile.fields.educationGraduationYearPlaceholder')}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
            </div>
            {backgroundError && <p className="mb-3.5 text-[13px] text-danger">{backgroundError}</p>}
            <Button type="button" onClick={saveBackground} loading={savingBackground}>
              {t('addDetails.save')}
            </Button>
          </SectionCard>

          <SectionCard
            title={t('addDetails.checklist.goals')}
            description={t('addDetails.goalsDescription')}
            done={completed.goals}
          >
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
            <Button type="button" onClick={saveGoals} loading={savingGoals} className="mt-4">
              {t('addDetails.save')}
            </Button>
          </SectionCard>

          <SectionCard
            title={t('addDetails.checklist.mobile')}
            description={t('addDetails.mobileDescription')}
            done={completed.mobile}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="flex items-center rounded-control border border-border px-3 text-sm text-slate">
                +91
              </div>
              <input
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                className="min-w-[160px] flex-1 rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
            </div>
            {mobileError && <p className="mb-3 text-[13px] text-danger">{mobileError}</p>}
            <Button type="button" onClick={saveMobile} loading={savingMobile}>
              {t('addDetails.save')}
            </Button>
          </SectionCard>

          <SectionCard
            title={t('addDetails.checklist.prefs')}
            description={t('addDetails.prefsDescription')}
            done={completed.prefs}
          >
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col">
                <label htmlFor="work-mode" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('public:filters.workMode.heading')}
                </label>
                <select
                  id="work-mode"
                  value={workMode}
                  onChange={(event) => setWorkMode(event.target.value)}
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
                >
                  <option value="Remote">{t('public:filters.workMode.remote')}</option>
                  <option value="Hybrid">{t('public:filters.workMode.hybrid')}</option>
                  <option value="On-site">{t('public:filters.workMode.onSite')}</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="open-to" className="mb-1.5 text-[13px] font-bold text-ink">
                  {t('addDetails.openTo')}
                </label>
                <select
                  id="open-to"
                  value={openTo}
                  onChange={(event) => setOpenTo(event.target.value)}
                  className="rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink"
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
            <Button type="button" onClick={savePrefs} loading={savingPrefs} className="mt-4">
              {t('addDetails.save')}
            </Button>
          </SectionCard>

          <SectionCard
            title={t('addDetails.checklist.skills')}
            description={t('profile.skillsBody')}
            done={completed.skills}
          >
            <SkillsTagInput
              value={skills}
              onChange={persistSkills}
              suggestions={SKILL_SUGGESTIONS}
              placeholder={t('profile.addSkillPlaceholder')}
              error={skillsError ?? undefined}
              removeSkillLabel={(skill) => t('profile.removeSkill', { skill })}
            />
          </SectionCard>

          {completionPercent === 100 && (
            <p className="mt-5 text-sm font-semibold text-teal">
              {t('addDetails.profileComplete')}{' '}
              <Link to={localize(ROUTES.candidateDashboard)} className="underline">
                {t('addDetails.backToDashboard')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
