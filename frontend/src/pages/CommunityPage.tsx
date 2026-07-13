import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const INCOME_TYPES = [
  {
    titleKey: 'community.incomeTypes.active.title',
    descKey: 'community.incomeTypes.active.desc',
    icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  },
  {
    titleKey: 'community.incomeTypes.community.title',
    descKey: 'community.incomeTypes.community.desc',
    icon: 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M9 8a3 3 0 1 0 0 6M17 9a2.5 2.5 0 1 0 0 5M14.5 14.5c2.6.2 4.5 2.4 4.5 5',
  },
  {
    titleKey: 'community.incomeTypes.passive.title',
    descKey: 'community.incomeTypes.passive.desc',
    icon: 'M4 19h16M4 15l4-4 3 3 5-6',
  },
  {
    titleKey: 'community.incomeTypes.partnership.title',
    descKey: 'community.incomeTypes.partnership.desc',
    icon: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  },
]

// Mock community listings — treated like company/organizer-authored content, not translated UI
// copy (same scoping as job/company data elsewhere).
const OPPORTUNITIES = [
  {
    title: 'Weekly Peer Mentor Circle',
    org: 'OpenOpportunity Community',
    location: 'Bengaluru · Online',
    skill: 'communication',
    desc: 'Practice interviewing and public speaking with peers in a structured weekly session.',
  },
  {
    title: 'Local Skill Exchange Meetup',
    org: 'Community Chapter — Pune',
    location: 'Pune · In-person',
    skill: 'collaboration',
    desc: 'Trade skills with neighbors — teach what you know, learn what you need.',
  },
  {
    title: 'Volunteer Coordination Team',
    org: 'Sahaay Community Fund',
    location: 'Remote',
    skill: 'leadership',
    desc: 'Help organize community events and manage volunteer schedules.',
  },
]

const GUIDE_KEYS = [
  'community.guides.whatIsCommunityIncome',
  'community.guides.activeVsPassive',
  'community.guides.softSkillsTransfer',
]

export default function CommunityPage() {
  const { t } = useTranslation('public')
  const [interested, setInterested] = useState<string[]>([])
  const [notified, setNotified] = useState(false)

  return (
    <main>
      <div className="bg-[#0B3B34]">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-center gap-8 px-6 py-11">
          <div>
            <span className="rounded-full bg-[rgba(127,224,196,0.12)] px-3 py-[5px] text-[12.5px] font-bold text-[#7FE0C4]">
              {t('community.badge')}
            </span>
            <h1 className="mt-3.5 mb-2.5 text-[27px] font-extrabold tracking-[-0.01em] text-white">
              {t('community.hero.title')}
            </h1>
            <p className="max-w-[460px] text-[15px] leading-[1.65] text-[#B9E9DC]">
              {t('community.hero.subtitle')}
            </p>
          </div>
          <div className="flex aspect-video items-center justify-center rounded-card border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)]">
            <div className="text-center text-[#7FE0C4]">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="#7FE0C4"
                className="mx-auto mb-2"
              >
                <circle cx="12" cy="12" r="11" fill="none" stroke="#7FE0C4" strokeWidth="1.5" />
                <path d="M10 8l6 4-6 4z" />
              </svg>
              <div className="font-mono text-xs">{t('community.hero.videoCaption')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-6 py-11">
        <h2 className="mb-[18px] text-[19px] font-bold text-ink">
          {t('community.incomeTypes.heading')}
        </h2>
        <div className="mb-11 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {INCOME_TYPES.map((incomeType) => (
            <div
              key={incomeType.titleKey}
              className="rounded-card border border-border bg-surface p-5"
            >
              <div className="mb-3 flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-teal-tint">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0F8A6B"
                  strokeWidth="2"
                >
                  <path d={incomeType.icon} />
                </svg>
              </div>
              <div className="mb-1.5 text-[14.5px] font-bold text-ink">{t(incomeType.titleKey)}</div>
              <p className="mb-3 text-[13px] leading-[1.55] text-slate">{t(incomeType.descKey)}</p>
              <a
                href="#read"
                onClick={(event) => event.preventDefault()}
                className="text-[13px] font-bold text-teal no-underline"
              >
                {t('community.incomeTypes.readGuide')}
              </a>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 search:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <h2 className="mb-[18px] text-[19px] font-bold text-ink">
              {t('community.opportunities.heading')}
            </h2>
            <div className="flex flex-col gap-3">
              {OPPORTUNITIES.map((opportunity) => {
                const hasInterest = interested.includes(opportunity.title)
                return (
                  <div
                    key={opportunity.title}
                    className="rounded-card border border-border bg-surface px-5 py-[18px]"
                  >
                    <div className="flex flex-wrap justify-between gap-2.5">
                      <div>
                        <div className="text-[15px] font-bold text-ink">{opportunity.title}</div>
                        <div className="mt-0.5 text-[13px] text-slate">
                          {opportunity.org} · {opportunity.location}
                        </div>
                      </div>
                      <span className="h-fit rounded-full bg-teal-tint px-2.5 py-1 text-xs font-semibold text-teal">
                        {t('community.opportunities.buildsSkill', { skill: opportunity.skill })}
                      </span>
                    </div>
                    <p className="mt-3 mb-3.5 text-[13.5px] leading-[1.55] text-slate">
                      {opportunity.desc}
                    </p>
                    <button
                      type="button"
                      disabled={hasInterest}
                      onClick={() => setInterested((titles) => [...titles, opportunity.title])}
                      className="rounded-lg bg-teal px-[18px] py-[9px] text-[13.5px] font-bold text-white disabled:opacity-70"
                    >
                      {hasInterest
                        ? t('community.opportunities.interestShared')
                        : t('community.opportunities.showInterest')}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <aside>
            <div className="mb-4 rounded-card border border-border bg-surface p-[22px]">
              <h3 className="mb-3 text-[15px] font-bold text-ink">
                {t('community.sidebar.tellUsHeading')}
              </h3>
              <p className="mb-3.5 text-[13px] leading-[1.55] text-slate">
                {t('community.sidebar.tellUsBody')}
              </p>
              <select
                className="mb-2.5 w-full rounded-[9px] border border-border bg-surface px-3 py-2.5 text-[13.5px] text-ink"
                defaultValue={t('community.sidebar.selectPlaceholder')}
              >
                <option>{t('community.sidebar.selectPlaceholder')}</option>
                <option>{t('community.sidebar.selectOption1')}</option>
                <option>{t('community.sidebar.selectOption2')}</option>
                <option>{t('community.sidebar.selectOption3')}</option>
              </select>
              <button
                type="button"
                disabled={notified}
                onClick={() => setNotified(true)}
                className="w-full rounded-[9px] bg-teal py-[11px] text-sm font-bold text-white disabled:opacity-70"
              >
                {notified ? t('community.sidebar.onList') : t('community.sidebar.notifyMe')}
              </button>
            </div>
            <div className="rounded-card border border-border bg-surface p-[22px]">
              <h3 className="mb-3 text-[15px] font-bold text-ink">
                {t('community.sidebar.guidesHeading')}
              </h3>
              {GUIDE_KEYS.map((guideKey) => (
                <a
                  key={guideKey}
                  href="#read"
                  onClick={(event) => event.preventDefault()}
                  className="block border-t border-[#F0F1F3] py-[9px] text-[13.5px] font-semibold text-ink no-underline"
                >
                  {t(guideKey)}
                </a>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
