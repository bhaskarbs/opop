import { type KeyboardEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { candidateProfile, profileCompletionPercent } from '../../mocks/candidateProfile'

const NAV_SECTIONS = [
  { labelKey: 'profile.nav.personalDetails', href: '#personal' },
  { labelKey: 'profile.nav.resume', href: '#resume' },
  { labelKey: 'profile.nav.skills', href: '#skills' },
  { labelKey: 'profile.nav.lifeGoals', href: '#goals' },
  { labelKey: 'profile.nav.accountSettings', href: '#account' },
]

export default function CandidateProfilePage() {
  const { t } = useTranslation('candidate')
  const completionPercent = profileCompletionPercent(candidateProfile.completedSections)

  const [fullName, setFullName] = useState(candidateProfile.name)
  const [location, setLocation] = useState(candidateProfile.location)
  const [email, setEmail] = useState(candidateProfile.email)
  const [mobile, setMobile] = useState(candidateProfile.mobile)

  const [resumeFileName, setResumeFileName] = useState(candidateProfile.resumeFileName)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  const [skills, setSkills] = useState(candidateProfile.skills)
  const [newSkill, setNewSkill] = useState('')

  const [lifeGoals, setLifeGoals] = useState('')
  const [workCulture, setWorkCulture] = useState('')
  const [savedGoals, setSavedGoals] = useState(false)

  function addSkill(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const trimmed = newSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
    }
    setNewSkill('')
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill))
  }

  function handleSaveGoals() {
    setSavedGoals(true)
    setTimeout(() => setSavedGoals(false), 2000)
  }

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-7 pb-16">
      <div className="profile:grid-cols-[240px_minmax(0,1fr)] grid grid-cols-1 gap-6">
        <aside className="profile:order-none order-first">
          <Card className="mb-4 p-[22px] text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-[22px] font-bold text-white">
              {candidateProfile.initial}
            </div>
            <div className="text-base font-bold text-ink">{candidateProfile.name}</div>
            <div className="mt-0.5 text-[13px] text-fog">
              {candidateProfile.title} · {candidateProfile.location}
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
            <h2 className="mb-4 text-base font-bold text-ink">{t('profile.nav.personalDetails')}</h2>
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
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
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) setResumeFileName(file.name)
                }}
              />
            </div>
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
                <div className="text-xs text-fog">
                  {t('profile.resumeUploaded', {
                    uploaded: candidateProfile.resumeUploadedLabel,
                    size: candidateProfile.resumeSizeLabel,
                  })}
                </div>
              </div>
            </div>
          </Card>

          <Card id="skills" className="mb-[18px] p-[26px]">
            <h2 className="mb-1.5 text-base font-bold text-ink">{t('profile.nav.skills')}</h2>
            <p className="mb-3.5 text-[13px] text-fog">{t('profile.skillsBody')}</p>
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
            <div className="mt-[18px] flex items-center gap-3">
              <Button type="button" onClick={handleSaveGoals}>
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
