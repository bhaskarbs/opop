import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Spinner } from '../components/ui'
import { ApiError, type UserSummary } from '../lib/apiClient'
import { communityApi, type CommunityInterestPayload } from '../lib/communityApi'
import { useAuthStore } from '../stores/authStore'
import { useCandidateProfileStore } from '../stores/candidateProfileStore'
import { useCompanyProfileStore } from '../stores/companyProfileStore'

// Flip to true to bring the "Know more about income types" button (and its request-a-guide
// modal below) back — hidden for now, but the feature itself is untouched.
const SHOW_READ_GUIDE_BUTTON = false

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

/** Fills in the interest form from the signed-in user's own profile rather than asking them to
 * retype it — mobile/company name live on the role-specific profile (not on the auth session
 * itself), fetched cache-first so this doesn't cost an extra network round trip if the profile
 * was already loaded elsewhere this session. */
async function loggedInInterestPayload(user: UserSummary): Promise<CommunityInterestPayload> {
  if (user.role === 'COMPANY') {
    const profile = await useCompanyProfileStore.getState().fetchProfile()
    return {
      name: user.fullName,
      companyName: profile.companyName,
      email: user.email,
      phone: profile.contactNumber,
    }
  }
  if (user.role === 'CANDIDATE') {
    const profile = await useCandidateProfileStore.getState().fetchProfile()
    return { name: user.fullName, companyName: null, email: user.email, phone: profile.mobile }
  }
  return { name: user.fullName, companyName: null, email: user.email, phone: null }
}

export default function CommunityPage() {
  const { t } = useTranslation('public')
  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const [videoOpen, setVideoOpen] = useState(false)
  const [interestModalOpen, setInterestModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [interestSending, setInterestSending] = useState(false)
  const [interestSent, setInterestSent] = useState(false)
  const [interestError, setInterestError] = useState<string | null>(null)

  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [guideName, setGuideName] = useState('')
  const [guideEmail, setGuideEmail] = useState('')
  const [guidePhone, setGuidePhone] = useState('')
  const [guideSending, setGuideSending] = useState(false)
  const [guideSent, setGuideSent] = useState(false)
  const [guideError, setGuideError] = useState<string | null>(null)

  function closeInterestModal() {
    setInterestModalOpen(false)
    setInterestError(null)
  }

  // Signed-in users skip the form entirely — their own profile already has everything the form
  // would ask for, so prompting them to retype it is just friction (and the guest-only modal is
  // the thing that would otherwise pop up here). Guests still go through handleSubmitInterest via
  // the modal below.
  function handleKnowMoreClick() {
    if (authStatus === 'authenticated' && user) {
      void submitInterestFor(loggedInInterestPayload(user))
    } else {
      setInterestModalOpen(true)
    }
  }

  async function submitInterestFor(
    payload: CommunityInterestPayload | Promise<CommunityInterestPayload>,
  ) {
    setInterestSending(true)
    setInterestError(null)
    try {
      await communityApi.notifyInterest(await payload)
      setInterestSent(true)
      setInterestModalOpen(false)
    } catch (caught) {
      setInterestError(
        caught instanceof ApiError ? caught.message : t('community.hero.knowMoreError'),
      )
    } finally {
      setInterestSending(false)
    }
  }

  function handleSubmitInterest() {
    return submitInterestFor({
      name,
      companyName: companyName || null,
      email,
      phone: phone || null,
    })
  }

  function closeGuideModal() {
    setGuideModalOpen(false)
    setGuideError(null)
  }

  // Same signed-in shortcut as handleKnowMoreClick above.
  function handleReadGuideClick() {
    if (authStatus === 'authenticated' && user) {
      void submitGuideRequestFor(loggedInInterestPayload(user))
    } else {
      setGuideModalOpen(true)
    }
  }

  async function submitGuideRequestFor(
    payload: CommunityInterestPayload | Promise<CommunityInterestPayload>,
  ) {
    setGuideSending(true)
    setGuideError(null)
    try {
      await communityApi.notifyInterest(await payload)
      setGuideSent(true)
      setGuideModalOpen(false)
    } catch (caught) {
      setGuideError(
        caught instanceof ApiError ? caught.message : t('community.incomeTypes.guideModal.error'),
      )
    } finally {
      setGuideSending(false)
    }
  }

  function handleSubmitGuideRequest() {
    return submitGuideRequestFor({
      name: guideName,
      companyName: null,
      email: guideEmail,
      phone: guidePhone || null,
    })
  }

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
            <p className="mb-5 max-w-[460px] text-[15px] leading-[1.65] text-[#B9E9DC]">
              {t('community.hero.subtitle')}
            </p>
            {interestSent ? (
              <p className="text-sm font-semibold text-[#7FE0C4]">
                {t('community.hero.knowMoreSent')}
              </p>
            ) : (
              <>
                <button
                  type="button"
                  disabled={interestSending}
                  onClick={handleKnowMoreClick}
                  className="flex items-center gap-2 rounded-[9px] bg-teal px-[22px] py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {interestSending && <Spinner className="h-4 w-4" />}
                  {t('community.hero.knowMore')}
                </button>
                {interestError && !interestModalOpen && (
                  <p className="mt-2.5 text-[12.5px] font-semibold text-danger">{interestError}</p>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="flex aspect-video items-center justify-center rounded-card border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(rgba(10,12,18,0.35),rgba(10,12,18,0.55)),url(/videos/community-hero-thumbnail.jpg)] bg-cover bg-center"
          >
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
          </button>
        </div>
      </div>

      {videoOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[rgba(20,24,31,0.75)] p-5">
          <div className="relative flex aspect-video w-full max-w-[800px] items-center justify-center overflow-hidden rounded-2xl bg-footer">
            <button
              type="button"
              onClick={() => setVideoOpen(false)}
              className="absolute top-3.5 right-3.5 z-10 h-8 w-8 rounded-full bg-[rgba(255,255,255,0.12)] text-base text-white"
            >
              ×
            </button>
            <video
              src="/videos/community-hero.mp4"
              poster="/videos/community-hero-thumbnail.jpg"
              controls
              autoPlay
              className="h-full w-full rounded-2xl object-contain"
            >
              {t('community.hero.videoCaption')}
            </video>
          </div>
        </div>
      )}

      {interestModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#14181F]/75 p-5">
          <div className="relative w-full max-w-[440px] rounded-2xl bg-surface p-7">
            <button
              type="button"
              onClick={closeInterestModal}
              aria-label={t('community.hero.knowMoreModal.close')}
              className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-tint text-[15px]"
            >
              ×
            </button>
            <h3 className="mb-1 text-[17px] font-bold text-ink">
              {t('community.hero.knowMoreModal.heading')}
            </h3>
            <p className="mb-[18px] text-[13px] text-slate">
              {t('community.hero.knowMoreModal.body')}
            </p>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('community.hero.knowMoreModal.name')}
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mb-3.5 w-full rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
            />

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('community.hero.knowMoreModal.companyName')}
            </label>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="mb-3.5 w-full rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
            />

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('community.hero.knowMoreModal.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mb-3.5 w-full rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
            />

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('community.hero.knowMoreModal.phone')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mb-4 w-full rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
            />

            {interestError && (
              <p className="mb-3.5 text-[12.5px] font-semibold text-danger">{interestError}</p>
            )}

            <button
              type="button"
              disabled={interestSending || !name || !email}
              onClick={handleSubmitInterest}
              className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-ink py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {interestSending && <Spinner className="h-4 w-4" />}
              {t('community.hero.knowMoreModal.submit')}
            </button>
          </div>
        </div>
      )}

      {guideModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#14181F]/75 p-5">
          <div className="relative w-full max-w-[440px] rounded-2xl bg-surface p-7">
            <button
              type="button"
              onClick={closeGuideModal}
              aria-label={t('community.incomeTypes.guideModal.close')}
              className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-tint text-[15px]"
            >
              ×
            </button>
            <h3 className="mb-1 text-[17px] font-bold text-ink">
              {t('community.incomeTypes.guideModal.heading')}
            </h3>
            <p className="mb-[18px] text-[13px] text-slate">
              {t('community.incomeTypes.guideModal.body')}
            </p>

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('community.incomeTypes.guideModal.name')}
            </label>
            <input
              value={guideName}
              onChange={(event) => setGuideName(event.target.value)}
              className="mb-3.5 w-full rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
            />

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('community.incomeTypes.guideModal.email')}
            </label>
            <input
              type="email"
              value={guideEmail}
              onChange={(event) => setGuideEmail(event.target.value)}
              className="mb-3.5 w-full rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
            />

            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A414D]">
              {t('community.incomeTypes.guideModal.phone')}
            </label>
            <input
              type="tel"
              value={guidePhone}
              onChange={(event) => setGuidePhone(event.target.value)}
              className="mb-4 w-full rounded-lg border border-border px-3 py-2.5 text-[13.5px]"
            />

            {guideError && (
              <p className="mb-3.5 text-[12.5px] font-semibold text-danger">{guideError}</p>
            )}

            <button
              type="button"
              disabled={guideSending || !guideName || !guideEmail}
              onClick={handleSubmitGuideRequest}
              className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-ink py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {guideSending && <Spinner className="h-4 w-4" />}
              {t('community.incomeTypes.guideModal.submit')}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1120px] px-6 py-11">
        <h2 className="mb-[18px] text-[19px] font-bold text-ink">
          {t('community.incomeTypes.heading')}
        </h2>
        <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
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
              <div className="mb-1.5 text-[14.5px] font-bold text-ink">
                {t(incomeType.titleKey)}
              </div>
              <p className="text-[13px] leading-[1.55] text-slate">{t(incomeType.descKey)}</p>
            </div>
          ))}
        </div>
        {SHOW_READ_GUIDE_BUTTON && (
          <div className="flex flex-col items-center">
            {guideSent ? (
              <p className="text-sm font-semibold text-teal">
                {t('community.incomeTypes.guideSent')}
              </p>
            ) : (
              <>
                <button
                  type="button"
                  disabled={guideSending}
                  onClick={handleReadGuideClick}
                  className="flex items-center gap-2 rounded-[9px] border border-teal px-[22px] py-3 text-sm font-bold text-teal disabled:opacity-60"
                >
                  {guideSending && <Spinner className="h-4 w-4" />}
                  {t('community.incomeTypes.readGuide')}
                </button>
                {guideError && !guideModalOpen && (
                  <p className="mt-2.5 text-[12.5px] font-semibold text-danger">{guideError}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
