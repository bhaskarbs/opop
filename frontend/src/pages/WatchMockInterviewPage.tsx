import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { mockInterviewShareVideoSrc } from '../lib/mockInterviewApi'

// Deliberately its own top-level route (see App.tsx), not nested under PublicLayout — same
// reasoning as WatchSharedVideoPage: someone opening a candidate's shared link shouldn't land in
// the full site chrome, just the video. No metadata fetch first (unlike WatchSharedVideoPage) —
// there's nothing to show but the video itself, so an invalid/expired token is only ever
// discovered via the <video> element's own onError, not a separate API call.
export default function WatchMockInterviewPage() {
  const { t } = useTranslation('public')
  const { token } = useParams()
  const [videoError, setVideoError] = useState(false)

  if (!token || videoError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-footer px-6 text-center">
        <div className="flex items-center gap-2.5">
          <Logo context="footer" />
        </div>
        <p className="text-sm text-[#C7CCD6]">{t('watchMockInterview.loadError')}</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-footer">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <Logo context="footer" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-[900px]">
          <h1 className="mb-4 text-lg font-bold text-white">{t('watchMockInterview.title')}</h1>
          <video
            src={mockInterviewShareVideoSrc(token)}
            controls
            autoPlay
            onError={() => setVideoError(true)}
            className="w-full rounded-2xl bg-black"
          />
        </div>
      </div>
    </main>
  )
}
