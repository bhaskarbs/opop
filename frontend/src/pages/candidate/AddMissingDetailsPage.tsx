import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ApiError } from '../../lib/apiClient'
import { candidateApi, type CandidateProfileResponse } from '../../lib/candidateApi'
import { deriveCompletedSections, profileCompletionPercent } from '../../lib/candidateProfileCompletion'
import { PROFILE_CHECKLIST, type ChecklistKey } from '../../mocks/candidateProfile'
import { ROUTES } from '../../routes/paths'

// Rendered text only — item.label (mocks/candidateProfile.ts) stays as the underlying data field.
const CHECKLIST_LABEL_KEYS: Record<ChecklistKey, string> = {
  personal: 'addDetails.checklist.personal',
  resume: 'addDetails.checklist.resume',
  skills: 'addDetails.checklist.skills',
  goals: 'addDetails.checklist.goals',
  mobile: 'addDetails.checklist.mobile',
  prefs: 'addDetails.checklist.prefs',
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

  useEffect(() => {
    let cancelled = false
    candidateApi
      .getProfile()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setLifeGoals(data.lifeGoals ?? '')
        setWorkCulture(data.workCulture ?? '')
        setMobile(data.mobile)
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
  }, [t])

  async function saveGoals() {
    setGoalsError(null)
    setSavingGoals(true)
    try {
      setProfile(await candidateApi.updateGoals({ lifeGoals, workCulture }))
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
      setProfile(await candidateApi.updateMobile(mobile))
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
      setProfile(await candidateApi.updatePreferences({ workMode, openTo }))
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
            <Button type="button" onClick={saveGoals} disabled={savingGoals} className="mt-4">
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
              {/* No real OTP/SMS provider is wired up — this stays a cosmetic no-op, matching
                  the mock, while "Verify & save" below does the real persistence. */}
              <button
                type="button"
                className="rounded-control border border-border px-[18px] text-[13.5px] font-bold text-primary"
              >
                {t('addDetails.sendOtp')}
              </button>
            </div>
            {mobileError && <p className="mb-3 text-[13px] text-danger">{mobileError}</p>}
            <Button type="button" onClick={saveMobile} disabled={savingMobile}>
              {t('addDetails.verifyAndSave')}
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
            <Button type="button" onClick={savePrefs} disabled={savingPrefs} className="mt-4">
              {t('addDetails.save')}
            </Button>
          </SectionCard>

          <div className="rounded-card border border-border bg-surface p-[26px] opacity-60">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">{t('profile.nav.skills')}</h2>
              <span
                className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${
                  completed.skills ? 'bg-teal-tint text-teal' : 'bg-amber-tint text-amber'
                }`}
              >
                {completed.skills ? t('addDetails.complete') : t('addDetails.missing')}
              </span>
            </div>
            <p className="text-[13px] text-fog">
              {t('addDetails.skillsAdded', { count: profile.skills.length })}
            </p>
          </div>

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
