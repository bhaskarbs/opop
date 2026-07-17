import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'

const STEPS = [
  {
    step: '01',
    titleKey: 'partnerships.steps.share.title',
    descKey: 'partnerships.steps.share.desc',
  },
  {
    step: '02',
    titleKey: 'partnerships.steps.matched.title',
    descKey: 'partnerships.steps.matched.desc',
  },
  {
    step: '03',
    titleKey: 'partnerships.steps.seminar.title',
    descKey: 'partnerships.steps.seminar.desc',
  },
  {
    step: '04',
    titleKey: 'partnerships.steps.partner.title',
    descKey: 'partnerships.steps.partner.desc',
  },
]

function PlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export default function CompanyPartnershipsPage() {
  const { t } = useTranslation('company')
  const localize = useLocalizedPath()
  const [videoOpen, setVideoOpen] = useState(false)
  const [role, setRole] = useState('')
  const [interested, setInterested] = useState(false)

  return (
    <main>
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-10 px-6 py-14 profile:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <span className="rounded-full bg-amber-tint px-3 py-[5px] text-[12.5px] font-bold text-amber">
            {t('partnerships.badge')}
          </span>
          <h1 className="mt-4 mb-3.5 text-[clamp(28px,4vw,40px)] leading-[1.15] font-extrabold tracking-[-0.01em] text-ink">
            {t('partnerships.hero.title')}
          </h1>
          <p className="mb-[26px] text-[15.5px] leading-[1.6] text-slate">
            {t('partnerships.hero.subtitle')}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="inline-flex items-center gap-2 rounded-[9px] bg-ink px-[22px] py-3 text-sm font-bold text-white"
            >
              <PlayIcon size={15} />
              {t('partnerships.hero.watchExplainer')}
            </button>
            <Link
              to={localize(ROUTES.ideasBrowse)}
              className="rounded-[9px] border border-border bg-surface px-[22px] py-3 text-sm font-bold text-ink no-underline"
            >
              {t('partnerships.hero.exploreIdeas')}
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className="relative flex aspect-[4/3] cursor-pointer items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#101522,#1B2130)]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)]">
            <PlayIcon size={22} />
          </span>
          <span className="absolute bottom-4 left-4 font-mono text-xs text-[#B4BAC6]">
            {t('partnerships.hero.videoCaption')}
          </span>
        </button>
      </div>

      {videoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,24,31,0.75)] p-5">
          <div className="relative flex aspect-video w-full max-w-[800px] items-center justify-center rounded-2xl bg-footer">
            <button
              type="button"
              onClick={() => setVideoOpen(false)}
              className="absolute top-3.5 right-3.5 h-8 w-8 rounded-full bg-[rgba(255,255,255,0.12)] text-base text-white"
            >
              ×
            </button>
            <div className="text-center font-mono text-[12.5px] text-[#7FA0F2]">
              {t('partnerships.videoModal.caption')}
            </div>
          </div>
        </div>
      )}

      <div className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 px-6 py-11">
          {STEPS.map((step) => (
            <div key={step.step}>
              <div className="mb-2 text-[22px] font-extrabold text-border">{step.step}</div>
              <div className="mb-1.5 text-[14.5px] font-bold text-ink">{t(step.titleKey)}</div>
              <div className="text-[13px] leading-[1.55] text-slate">{t(step.descKey)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[18px] bg-ink p-10">
          <div>
            <div className="mb-1.5 text-[17px] font-bold text-white">
              {t('partnerships.cta.heading')}
            </div>
            <div className="text-sm text-[#B4BAC6]">{t('partnerships.cta.body')}</div>
          </div>
          {interested ? (
            <div className="text-sm font-bold text-[#7FE0C4]">{t('partnerships.cta.thanks')}</div>
          ) : (
            <form
              className="flex flex-wrap gap-2.5"
              onSubmit={(event) => {
                event.preventDefault()
                setInterested(true)
              }}
            >
              <input
                type="text"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder={t('partnerships.cta.placeholder')}
                className="w-[200px] rounded-[9px] border-none bg-white px-3.5 py-3 text-sm"
              />
              <button
                type="submit"
                className="rounded-[9px] bg-white px-[22px] text-sm font-bold text-ink"
              >
                {t('partnerships.cta.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
