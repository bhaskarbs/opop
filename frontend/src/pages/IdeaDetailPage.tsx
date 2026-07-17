import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import { avatarColorClass } from '../lib/ideaAvatar'
import { ideasApi, type BackendIdeaStage, type IdeaDetail as IdeaDetailData } from '../lib/ideasApi'
import { ROUTES } from '../routes/paths'
import { useAuthStore } from '../stores/authStore'

const STAGE_KEYS: Record<BackendIdeaStage, string> = {
  CONCEPT: 'browse.stages.concept',
  PROTOTYPE: 'browse.stages.prototype',
  LIVE: 'browse.stages.live',
}

type ApplyRole = 'investor' | 'participant'

export default function IdeaDetailPage() {
  const { t } = useTranslation('ideas')
  const localize = useLocalizedPath()
  const { ideaId } = useParams()
  const status = useAuthStore((state) => state.status)
  const [modalRole, setModalRole] = useState<ApplyRole | null>(null)
  const [ticketSize, setTicketSize] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [idea, setIdea] = useState<IdeaDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ideaId) return
    let cancelled = false
    ideasApi
      .get(ideaId)
      .then((detail) => {
        if (!cancelled) setIdea(detail)
      })
      .catch(() => {
        if (!cancelled) setIdea(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ideaId])

  if (loading) {
    return <main className="mx-auto max-w-[960px] px-6 py-16 text-center text-sm text-slate" />
  }

  if (!idea) {
    return (
      <main className="mx-auto max-w-[960px] px-6 py-16 text-center text-sm text-slate">
        {t('detail.notFound')}
      </main>
    )
  }

  function closeModal() {
    setModalRole(null)
    setTicketSize('')
    setMessage('')
    setSubmitted(false)
  }

  const isLoggedIn = status === 'authenticated'
  const submittedDate = new Date(idea.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <main className="mx-auto grid max-w-[960px] grid-cols-1 gap-5 px-6 py-8 pb-16">
      <Link to={localize(ROUTES.ideasBrowse)} className="text-[13px] font-semibold no-underline">
        {t('detail.backToAll')}
      </Link>

      <div className="rounded-2xl border border-border bg-surface p-7">
        <div className="mb-3.5 flex flex-wrap gap-2">
          <span className="rounded-full bg-teal-tint px-2.5 py-[3px] text-[11.5px] font-bold text-teal">
            {idea.category}
          </span>
          <span className="rounded-full bg-teal-tint px-2.5 py-[3px] text-[11.5px] font-bold text-teal">
            {t(STAGE_KEYS[idea.stage])}
          </span>
        </div>
        <h1 className="mb-2.5 text-2xl font-extrabold tracking-[-0.01em] text-ink">{idea.title}</h1>
        <div className="mb-5 flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-[12.5px] font-bold text-white ${avatarColorClass(idea.submitterName)}`}
          >
            {idea.submitterName.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="text-[13.5px] font-bold text-ink">
              {idea.submitterName}{' '}
              <span className="font-medium text-fog">
                · {t(`browse.submitterTypes.${idea.submitterRole.toLowerCase()}`)}
              </span>
            </div>
            <div className="text-xs text-fog">
              {t('detail.submittedMeta', { date: submittedDate, count: 0 })}
            </div>
          </div>
        </div>

        <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 rounded-xl bg-page p-[18px]">
          <div>
            <div className="mb-[3px] text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('detail.fundingRequired')}
            </div>
            <div className="text-sm font-bold text-ink">{idea.funding ?? '—'}</div>
          </div>
          <div>
            <div className="mb-[3px] text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('detail.equityOffered')}
            </div>
            <div className="text-sm font-bold text-ink">{idea.equity ?? '—'}</div>
          </div>
          <div>
            <div className="mb-[3px] text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('detail.teamSize')}
            </div>
            <div className="text-sm font-bold text-ink">{idea.teamSize ?? '—'}</div>
          </div>
          <div>
            <div className="mb-[3px] text-[11.5px] tracking-[0.03em] text-fog uppercase">
              {t('detail.timeline')}
            </div>
            <div className="text-sm font-bold text-ink">{idea.timeline ?? '—'}</div>
          </div>
        </div>

        <h3 className="mb-2 text-[14.5px] font-bold text-ink">{t('detail.problemStatement')}</h3>
        <p className="mb-[18px] text-sm leading-[1.65] text-[#3A414D]">{idea.problem}</p>

        <h3 className="mb-2 text-[14.5px] font-bold text-ink">{t('detail.theIdea')}</h3>
        <p className="mb-[18px] text-sm leading-[1.65] text-[#3A414D]">
          {idea.solution} {idea.targetMarket}
        </p>

        {idea.videoLink && (
          <>
            <h3 className="mb-2 text-[14.5px] font-bold text-ink">{t('detail.videoPitch')}</h3>
            <a
              href={idea.videoLink}
              target="_blank"
              rel="noreferrer"
              className="mb-1 flex aspect-video max-w-[420px] items-center justify-center rounded-xl bg-[#101522] no-underline"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </a>
          </>
        )}
      </div>

      <div className="sticky bottom-4 rounded-2xl border border-border bg-surface p-6">
        <div className="mb-3 text-[14.5px] font-bold text-ink">{t('detail.interestedHeading')}</div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setModalRole('investor')}
            className="min-w-[180px] flex-1 rounded-[9px] bg-primary py-3 text-sm font-bold text-white"
          >
            {t('detail.applyAsInvestor')}
          </button>
          <button
            type="button"
            onClick={() => setModalRole('participant')}
            className="min-w-[180px] flex-1 rounded-[9px] border border-border bg-surface py-3 text-sm font-bold text-ink"
          >
            {t('detail.applyAsParticipant')}
          </button>
        </div>
      </div>

      {modalRole && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#14181F]/75 p-5">
          <div className="relative w-full max-w-[440px] rounded-2xl bg-surface p-7">
            <button
              type="button"
              onClick={closeModal}
              aria-label={t('detail.modal.submitInterest')}
              className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-tint text-[15px]"
            >
              ×
            </button>

            {isLoggedIn ? (
              submitted ? (
                <p className="py-4 text-center text-sm font-semibold text-teal">
                  {t('detail.modal.interestSubmitted')}
                </p>
              ) : (
                <>
                  <h3 className="mb-1 text-[17px] font-bold text-ink">
                    {t('detail.modal.applyAs', {
                      role: t(`detail.modal.${modalRole}`),
                    })}
                  </h3>
                  <p className="mb-[18px] text-[13px] text-slate">{idea.title}</p>
                  {modalRole === 'investor' && (
                    <>
                      <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
                        {t('detail.modal.ticketSize')}
                      </label>
                      <input
                        value={ticketSize}
                        onChange={(event) => setTicketSize(event.target.value)}
                        placeholder={t('detail.modal.ticketSizePlaceholder')}
                        className="mb-3.5 w-full rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
                      />
                    </>
                  )}
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
                    {t('detail.modal.message')}
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={t('detail.modal.messagePlaceholder')}
                    className="mb-4 w-full resize-y rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => setSubmitted(true)}
                    className="w-full rounded-[9px] bg-ink py-3 text-sm font-bold text-white"
                  >
                    {t('detail.modal.submitInterest')}
                  </button>
                </>
              )
            ) : (
              <>
                <h3 className="mb-2 text-[17px] font-bold text-ink">
                  {t('detail.modal.loginHeading')}
                </h3>
                <p className="mb-[18px] text-[13.5px] leading-[1.6] text-slate">
                  {t('detail.modal.loginBody')}
                </p>
                <div className="flex gap-2.5">
                  <Link
                    to={localize(ROUTES.login)}
                    className="flex-1 rounded-[9px] bg-ink py-2.5 text-center text-[13.5px] font-bold text-white no-underline"
                  >
                    {t('detail.modal.logIn')}
                  </Link>
                  <Link
                    to={localize(ROUTES.register)}
                    className="flex-1 rounded-[9px] border border-border py-2.5 text-center text-[13.5px] font-bold text-ink no-underline"
                  >
                    {t('detail.modal.register')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
