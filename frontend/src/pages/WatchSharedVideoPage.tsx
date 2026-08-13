import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { LoadingState } from '../components/ui'
import { API_BASE_URL, ApiError } from '../lib/apiClient'
import { sharedVideoApi, type SharedVideoMetadata } from '../lib/sharedVideoApi'

// How often the player's current position gets reported while playing — recordProgress is a
// no-op on the backend unless this exceeds the previously reported max, so over-reporting the
// same position (e.g. while paused) costs nothing but a wasted request; this interval just
// bounds how stale "how far they've watched" can be in the admin's tracking view.
const PROGRESS_REPORT_INTERVAL_MS = 5000

// Deliberately its own top-level route (see App.tsx), not nested under PublicLayout — an
// external recipient opening an emailed link shouldn't land in the full site chrome (nav links
// to jobs/partnerships/login that have nothing to do with why they're here), just the video.
export default function WatchSharedVideoPage() {
  const { t } = useTranslation('public')
  const { token } = useParams()

  const [metadata, setMetadata] = useState<SharedVideoMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastReportedRef = useRef(0)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    sharedVideoApi
      .getMetadata(token)
      .then((result) => {
        if (!cancelled) setMetadata(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t('watchVideo.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, t])

  useEffect(() => {
    if (!token) return

    function reportProgress(useBeacon: boolean) {
      const video = videoRef.current
      if (!video) return
      const watchedSeconds = Math.floor(video.currentTime)
      if (watchedSeconds <= lastReportedRef.current) return
      lastReportedRef.current = watchedSeconds
      const url = `${API_BASE_URL}/api/shared-videos/${token}/progress`
      const body = JSON.stringify({ watchedSeconds })
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      } else {
        sharedVideoApi.recordProgress(token!, watchedSeconds).catch(() => {
          // Best-effort — a missed progress ping just means slightly stale tracking, not a
          // reason to interrupt playback with an error.
        })
      }
    }

    const interval = setInterval(() => reportProgress(false), PROGRESS_REPORT_INTERVAL_MS)
    const handleUnload = () => reportProgress(true)
    window.addEventListener('pagehide', handleUnload)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') reportProgress(true)
    })
    return () => {
      clearInterval(interval)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [token])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-footer">
        <LoadingState message={t('watchVideo.loading')} />
      </main>
    )
  }

  if (error || !metadata || !token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-footer px-6 text-center">
        <div className="flex items-center gap-2.5">
          <Logo context="footer" />
        </div>
        <p className="text-sm text-[#C7CCD6]">{error ?? t('watchVideo.loadError')}</p>
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
          <h1 className="mb-4 text-lg font-bold text-white">{metadata.title}</h1>
          <video
            ref={videoRef}
            src={sharedVideoApi.videoSrc(token)}
            controls
            autoPlay
            className="w-full rounded-2xl bg-black"
          />
        </div>
      </div>
    </main>
  )
}
