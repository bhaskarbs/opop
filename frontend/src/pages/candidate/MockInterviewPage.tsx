import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/apiClient'
import { mockInterviewApi, type MockInterviewSessionSummary } from '../../lib/mockInterviewApi'

// Practice questions are canned/static content, not backend data — same treatment as other
// decorative-but-real content in this app (see IDEA_CATEGORIES). MediaRecorder picks whichever
// mimeType the browser actually supports; Chrome/Firefox/Edge all support webm/vp8+opus.
const RECORDER_MIME_TYPE = 'video/webm;codecs=vp8,opus'

const QUESTION_BANK: Record<string, string[]> = {
  'Frontend Developer — behavioral': [
    'Tell me about a time you had to debug a difficult production issue. What was your process?',
    'Describe a situation where you disagreed with a teammate’s technical decision. How did you handle it?',
    'Walk me through a project you’re proud of, end to end.',
    'How do you prioritize when you have multiple deadlines at once?',
  ],
  'Frontend Developer — technical': [
    'How would you optimize a React app that re-renders too often?',
    'Explain the difference between server-side and client-side rendering.',
    'How do you approach making a complex UI accessible?',
    'Describe how you’d structure state for a large form with interdependent fields.',
  ],
  'General soft skills': [
    'Tell me about yourself.',
    'What’s a piece of feedback that changed how you work?',
    'Describe a time you had to learn something new under time pressure.',
    'Where do you see yourself in three years?',
  ],
}

const CATEGORIES = Object.keys(QUESTION_BANK)

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function MockInterviewPage() {
  const { t } = useTranslation('candidate')

  const [sessions, setSessions] = useState<MockInterviewSessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const [category, setCategory] = useState(CATEGORIES[0]!)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const [hasStream, setHasStream] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [playback, setPlayback] = useState<{ url: string } | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false
    mockInterviewApi
      .mine()
      .then((result) => {
        if (!cancelled) setSessions(result)
      })
      .catch(() => {
        // Best-effort — an empty "Recorded logs" list is a reasonable fallback.
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (playback) URL.revokeObjectURL(playback.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only, not a reactive effect
  }, [])

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setHasStream(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function handleStart() {
    setCameraError(null)
    setUploadError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      setHasStream(true)
      if (videoRef.current) videoRef.current.srcObject = stream
      setMicOn(true)
      setCameraOn(true)

      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported(RECORDER_MIME_TYPE)
          ? { mimeType: RECORDER_MIME_TYPE }
          : undefined,
      )
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => void handleRecordingStopped()
      recorder.onstart = () => {
        recordingStartedAtRef.current = Date.now()
      }
      recorderRef.current = recorder
      recorder.start()
      setQuestionIndex(0)
      setRecording(true)
    } catch {
      setCameraError(t('mockInterview.cameraUnavailable'))
    }
  }

  function handleStop() {
    recorderRef.current?.stop()
    setRecording(false)
  }

  async function handleRecordingStopped() {
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - recordingStartedAtRef.current) / 1000),
    )
    const video = new Blob(chunksRef.current, { type: 'video/webm' })
    chunksRef.current = []
    stopStream()

    setUploading(true)
    setUploadError(null)
    try {
      const summary = await mockInterviewApi.upload({
        video,
        category,
        questionCount: QUESTION_BANK[category]!.length,
        durationSeconds,
      })
      setSessions((prev) => [summary, ...prev])
    } catch (caught) {
      setUploadError(caught instanceof ApiError ? caught.message : t('mockInterview.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  function toggleMic() {
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMicOn(track.enabled)
  }

  function toggleCamera() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setCameraOn(track.enabled)
  }

  function nextQuestion() {
    setQuestionIndex((index) => Math.min(index + 1, QUESTION_BANK[category]!.length - 1))
  }

  async function handleWatch(sessionId: string) {
    setPlaybackError(null)
    try {
      const blob = await mockInterviewApi.video(sessionId)
      setPlayback({ url: URL.createObjectURL(blob) })
    } catch (caught) {
      setPlaybackError(
        caught instanceof ApiError ? caught.message : t('mockInterview.playbackError'),
      )
    }
  }

  function closePlayback() {
    if (playback) URL.revokeObjectURL(playback.url)
    setPlayback(null)
  }

  const questions = QUESTION_BANK[category]!
  const currentQuestion = questions[questionIndex]!

  return (
    <main className="mx-auto max-w-[1120px] px-6 pt-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('mockInterview.title')}</h1>
      <p className="mb-6 text-sm text-slate">{t('mockInterview.subtitle')}</p>

      <div className="mb-9 grid grid-cols-1 gap-6 profile:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-footer">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${hasStream ? '' : 'hidden'}`}
          />
          {!hasStream && (
            <div className="text-center text-slate">
              <svg
                width="46"
                height="46"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5B6472"
                strokeWidth="1.6"
                className="mx-auto mb-2.5"
              >
                <rect x="2" y="6" width="15" height="12" rx="2" />
                <path d="M17 10l5-3v10l-5-3" />
              </svg>
              <div className="font-mono text-[12.5px]">
                {cameraError ?? t('mockInterview.cameraPreview')}
              </div>
            </div>
          )}
          {recording && (
            <span className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {t('mockInterview.recording')}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!recording}
              aria-label={t('mockInterview.toggleMic')}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white disabled:opacity-50"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={micOn ? '#14181F' : '#E11D48'}
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={recording ? handleStop : undefined}
              disabled={!recording}
              aria-label={t('mockInterview.stopRecording')}
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-danger disabled:opacity-50"
            >
              <span className="h-[18px] w-[18px] rounded bg-white" />
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!recording}
              aria-label={t('mockInterview.toggleCamera')}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white disabled:opacity-50"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={cameraOn ? '#14181F' : '#E11D48'}
                strokeWidth="2"
              >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <div className="mb-3.5 rounded-card border border-border bg-surface p-5">
            <div className="mb-3 inline-block rounded-full bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary">
              {t('mockInterview.questionProgress', {
                current: questionIndex + 1,
                total: questions.length,
              })}
            </div>
            <div className="text-[15px] leading-normal font-bold text-ink">{currentQuestion}</div>
            {recording && questionIndex < questions.length - 1 && (
              <button
                type="button"
                onClick={nextQuestion}
                className="mt-3 text-[13px] font-bold text-primary"
              >
                {t('mockInterview.nextQuestion')}
              </button>
            )}
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={recording}
            className="mb-2.5 w-full rounded-[9px] border border-border bg-surface px-3 py-2.5 text-[13.5px] text-ink disabled:opacity-60"
          >
            {CATEGORIES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          {uploadError && (
            <p className="mb-2.5 text-[13px] font-semibold text-danger">{uploadError}</p>
          )}
          <button
            type="button"
            onClick={() => (recording ? handleStop() : void handleStart())}
            disabled={uploading}
            className="w-full rounded-[9px] bg-ink py-[11px] text-sm font-bold text-white disabled:opacity-60"
          >
            {uploading
              ? t('mockInterview.uploading')
              : recording
                ? t('mockInterview.stopAndSave')
                : t('mockInterview.startNewSession')}
          </button>
        </div>
      </div>

      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-base font-bold text-ink">{t('mockInterview.recordedLogs')}</h2>
        <span className="text-[13px] text-fog">
          {t('mockInterview.sessionsCount', { count: sessions.length })}
        </span>
      </div>
      {playbackError && (
        <p className="mb-3 text-[13px] font-semibold text-danger">{playbackError}</p>
      )}
      {sessionsLoading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('mockInterview.loadingSessions')}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          {t('mockInterview.noSessions')}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => handleWatch(session.id)}
              className="overflow-hidden rounded-card border border-border bg-surface text-left"
            >
              <div className="relative flex aspect-video items-center justify-center bg-neutral-tint">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(20,24,31,0.7)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="absolute right-2 bottom-2 rounded bg-[rgba(20,24,31,0.7)] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {formatDuration(session.durationSeconds)}
                </span>
              </div>
              <div className="p-3.5">
                <div className="mb-0.5 text-sm font-bold text-ink">{session.category}</div>
                <div className="text-[12.5px] text-fog">
                  {t('mockInterview.recordingMeta', {
                    date: new Date(session.recordedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }),
                    count: session.questionCount,
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {playback && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[rgba(20,24,31,0.75)] p-5">
          <div className="relative w-full max-w-[720px]">
            <button
              type="button"
              onClick={closePlayback}
              aria-label={t('mockInterview.close')}
              className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] text-base text-white"
            >
              ×
            </button>
            <video src={playback.url} controls autoPlay className="w-full rounded-2xl bg-footer" />
          </div>
        </div>
      )}
    </main>
  )
}
