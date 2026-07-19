import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/apiClient'
import { candidateApi } from '../../lib/candidateApi'
import { experienceLevelFromBackend } from '../../lib/jobEnums'
import type { BackendExperienceLevel } from '../../lib/jobsApi'
import { mockInterviewApi, type MockInterviewSessionSummary } from '../../lib/mockInterviewApi'

// Fallback questions for when the candidate has no skills selected for this session —
// otherwise every question is generated from QUESTION_TEMPLATES + their selected skills (see
// generateQuestion). Canned/static content, not backend data — same treatment as other
// decorative-but-real content in this app (see IDEA_CATEGORIES).
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
const QUESTIONS_PER_SESSION = 8
const MAX_SESSIONS = 3
const MAX_DURATION_SECONDS = 20 * 60

type TemplateInput = 'skill' | 'experienceLevel' | 'industry'

interface QuestionTemplate {
  text: string
  // Every listed input must have a real value for this template to be eligible — lets richer,
  // more specific questions surface once the candidate has filled in experience/industry,
  // without ever blocking on skill alone (see QUESTION_TEMPLATES below).
  requires: TemplateInput[]
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    text: 'Tell me about a time you used {{skill}} to solve a challenging problem.',
    requires: ['skill'],
  },
  {
    text: 'How would you explain {{skill}} to someone with no technical background?',
    requires: ['skill'],
  },
  { text: 'Describe a project where {{skill}} was critical to the outcome.', requires: ['skill'] },
  {
    text: 'What’s a mistake you made while working with {{skill}}, and what did you learn from it?',
    requires: ['skill'],
  },
  { text: 'How do you stay current with {{skill}}?', requires: ['skill'] },
  {
    text: 'What’s the hardest part of working with {{skill}}, in your experience?',
    requires: ['skill'],
  },
  {
    text: 'As a {{experienceLevel}} professional, how would you approach a {{skill}} challenge?',
    requires: ['skill', 'experienceLevel'],
  },
  {
    text: 'How has your approach to {{skill}} evolved as you’ve grown into a {{experienceLevel}} role?',
    requires: ['skill', 'experienceLevel'],
  },
  {
    text: 'How is {{skill}} typically applied in the {{industry}} industry?',
    requires: ['skill', 'industry'],
  },
  {
    text: 'What unique challenges does the {{industry}} industry present when applying {{skill}}?',
    requires: ['skill', 'industry'],
  },
  {
    text: 'As a {{experienceLevel}} candidate working in {{industry}}, how have you used {{skill}} to deliver results?',
    requires: ['skill', 'experienceLevel', 'industry'],
  },
]

// MediaRecorder picks whichever mimeType the browser actually supports; Chrome/Firefox/Edge
// all support webm/vp8+opus.
const RECORDER_MIME_TYPE = 'video/webm;codecs=vp8,opus'

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

/** Random and skill-based whenever the candidate has selected at least one skill for this
 * session — enriched with experience level and/or industry once those are filled in on the
 * candidate's profile (see QUESTION_TEMPLATES' `requires`). Falls back to the category's
 * canned question bank when no skills are selected. Avoids repeating the immediately-previous
 * question where it reasonably can. */
function generateQuestion(
  skills: string[],
  experienceLevel: string | null,
  industry: string | null,
  category: string,
  previous: string,
): string {
  if (skills.length === 0) {
    const pool = QUESTION_BANK[category]!
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = pickRandom(pool)
      if (candidate !== previous) return candidate
    }
    return pool[0]!
  }

  const available: Record<TemplateInput, boolean> = {
    skill: true,
    experienceLevel: !!experienceLevel,
    industry: !!industry,
  }
  const eligibleTemplates = QUESTION_TEMPLATES.filter((template) =>
    template.requires.every((input) => available[input]),
  )

  function fill(template: QuestionTemplate, skill: string): string {
    return template.text
      .replace('{{skill}}', skill)
      .replace('{{experienceLevel}}', (experienceLevel ?? '').toLowerCase())
      .replace('{{industry}}', industry ?? '')
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = fill(pickRandom(eligibleTemplates), pickRandom(skills))
    if (candidate !== previous) return candidate
  }
  return fill(eligibleTemplates[0]!, skills[0]!)
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Speaks a question aloud so the avatar "asks" it — heard live by the candidate during the
 * session. Browsers give no API to capture SpeechSynthesis output as a MediaStreamTrack, so
 * this can't be mixed into the MediaRecorder recording itself; only the candidate's own mic
 * (captured via getUserMedia below) ends up in the saved video. */
function speakQuestion(text: string, onStart: () => void, onEnd: () => void) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.onstart = onStart
  utterance.onend = onEnd
  utterance.onerror = onEnd
  window.speechSynthesis.speak(utterance)
}

/** Grabs a single still frame from the just-recorded clip to use as its thumbnail — seeks to a
 * fixed small offset rather than a duration-based one, since MediaRecorder-produced webm blobs
 * often report an Infinity duration until the container is fixed up (a known browser quirk).
 * Resolves null (not rejects) on any failure — a missing thumbnail is a fine fallback. */
function generateThumbnail(videoBlob: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const videoEl = document.createElement('video')
    videoEl.muted = true
    videoEl.playsInline = true
    const objectUrl = URL.createObjectURL(videoBlob)
    videoEl.src = objectUrl

    function finish(result: Blob | null) {
      URL.revokeObjectURL(objectUrl)
      resolve(result)
    }

    videoEl.addEventListener('loadeddata', () => {
      videoEl.currentTime = 0.3
    })
    videoEl.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = videoEl.videoWidth || 320
      canvas.height = videoEl.videoHeight || 180
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        finish(null)
        return
      }
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.8)
    })
    videoEl.addEventListener('error', () => finish(null))
  })
}

export default function MockInterviewPage() {
  const { t } = useTranslation('candidate')

  const [sessions, setSessions] = useState<MockInterviewSessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [experienceLevel, setExperienceLevel] = useState<BackendExperienceLevel | null>(null)
  const [industry, setIndustry] = useState<string | null>(null)
  const [lastQuestionSet, setLastQuestionSet] = useState<string[]>([])

  const [category, setCategory] = useState(CATEGORIES[0]!)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [avatarSpeaking, setAvatarSpeaking] = useState(false)
  const [recording, setRecording] = useState(false)
  const [hasStream, setHasStream] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [autoStopped, setAutoStopped] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(MAX_DURATION_SECONDS)

  const [playback, setPlayback] = useState<{ url: string } | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef<number>(0)
  const questionsAskedRef = useRef(0)
  const autoStopTimeoutRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const sessionQuestionsRef = useRef<string[]>([])
  const repeatModeRef = useRef(false)

  function loadThumbnail(session: MockInterviewSessionSummary) {
    if (!session.hasThumbnail) return
    mockInterviewApi
      .thumbnail(session.id)
      .then((blob) => {
        setThumbnailUrls((prev) => ({ ...prev, [session.id]: URL.createObjectURL(blob) }))
      })
      .catch(() => {
        // Best-effort — the card just falls back to the generic play-icon placeholder.
      })
  }

  useEffect(() => {
    let cancelled = false
    mockInterviewApi
      .mine()
      .then((result) => {
        if (cancelled) return
        setSessions(result)
        result.forEach(loadThumbnail)
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
    let cancelled = false
    candidateApi
      .getProfile()
      .then((profile) => {
        if (cancelled) return
        setSkills(profile.skills)
        setSelectedSkills(profile.skills)
        setExperienceLevel(profile.experienceLevel)
        setIndustry(profile.industry)
      })
      .catch(() => {
        // Best-effort — falls back to the canned question bank if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleSkillSelected(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      window.speechSynthesis?.cancel()
      if (autoStopTimeoutRef.current !== null) window.clearTimeout(autoStopTimeoutRef.current)
      if (countdownIntervalRef.current !== null) window.clearInterval(countdownIntervalRef.current)
      if (playback) URL.revokeObjectURL(playback.url)
      Object.values(thumbnailUrls).forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only, not a reactive effect
  }, [])

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setHasStream(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function askQuestion(previous: string) {
    const index = questionsAskedRef.current
    const repeated = repeatModeRef.current ? lastQuestionSet[index] : undefined
    const question =
      repeated ??
      generateQuestion(
        selectedSkills,
        experienceLevel ? experienceLevelFromBackend(experienceLevel) : null,
        industry,
        category,
        previous,
      )
    setCurrentQuestion(question)
    sessionQuestionsRef.current.push(question)
    questionsAskedRef.current += 1
    setQuestionsAsked(questionsAskedRef.current)
    speakQuestion(
      question,
      () => setAvatarSpeaking(true),
      () => setAvatarSpeaking(false),
    )
  }

  async function handleStart(repeat = false) {
    if (sessions.length >= MAX_SESSIONS) return
    setCameraError(null)
    setUploadError(null)
    setAutoStopped(false)
    repeatModeRef.current = repeat
    sessionQuestionsRef.current = []
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
        questionsAskedRef.current = 0
        askQuestion('')
        // Hard cutoff — matches the server-side MAX_DURATION_SECONDS backstop in
        // MockInterviewService, so a session can never silently run past the stated limit.
        autoStopTimeoutRef.current = window.setTimeout(() => {
          setAutoStopped(true)
          handleStop()
        }, MAX_DURATION_SECONDS * 1000)
        setRemainingSeconds(MAX_DURATION_SECONDS)
        countdownIntervalRef.current = window.setInterval(() => {
          const elapsed = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)
          setRemainingSeconds(Math.max(0, MAX_DURATION_SECONDS - elapsed))
        }, 1000)
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      setCameraError(t('mockInterview.cameraUnavailable'))
    }
  }

  function handleStop() {
    if (autoStopTimeoutRef.current !== null) {
      window.clearTimeout(autoStopTimeoutRef.current)
      autoStopTimeoutRef.current = null
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    window.speechSynthesis?.cancel()
    setAvatarSpeaking(false)
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
    const questionCount = questionsAskedRef.current
    stopStream()

    setUploading(true)
    setUploadError(null)
    try {
      const thumbnail = await generateThumbnail(video)
      const summary = await mockInterviewApi.upload({
        video,
        thumbnail,
        category,
        questionCount,
        durationSeconds,
      })
      setSessions((prev) => [summary, ...prev])
      loadThumbnail(summary)
      setLastQuestionSet(sessionQuestionsRef.current)
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
    askQuestion(currentQuestion)
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

  async function handleDelete(sessionId: string) {
    if (!window.confirm(t('mockInterview.deleteConfirm'))) return
    setDeletingId(sessionId)
    try {
      await mockInterviewApi.remove(sessionId)
      setSessions((prev) => prev.filter((session) => session.id !== sessionId))
      setThumbnailUrls((prev) => {
        const next = { ...prev }
        const url = next[sessionId]
        if (url) URL.revokeObjectURL(url)
        delete next[sessionId]
        return next
      })
    } catch (caught) {
      setUploadError(caught instanceof ApiError ? caught.message : t('mockInterview.deleteError'))
    } finally {
      setDeletingId(null)
    }
  }

  const atSessionLimit = sessions.length >= MAX_SESSIONS

  return (
    <main className="mx-auto max-w-[1120px] px-6 pt-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('mockInterview.title')}</h1>
      <p className="mb-1.5 text-sm text-slate">{t('mockInterview.subtitle')}</p>
      <p className="mb-6 text-[13px] text-fog">{t('mockInterview.limitsNotice')}</p>

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
          {recording && (
            <span
              className={`absolute top-4 right-4 rounded-full px-4 py-1.5 text-2xl font-extrabold tabular-nums text-white ${
                remainingSeconds <= 60 ? 'bg-danger' : 'bg-[rgba(20,24,31,0.7)]'
              }`}
            >
              {formatDuration(remainingSeconds)}
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
              onClick={() => (recording ? handleStop() : undefined)}
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
                current: Math.min(questionsAsked, QUESTIONS_PER_SESSION),
                total: QUESTIONS_PER_SESSION,
              })}
            </div>
            {recording ? (
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white ${avatarSpeaking ? 'ring-primary/30 ring-4' : ''}`}
                  aria-hidden="true"
                >
                  AI
                </div>
                <div>
                  <div className="mb-0.5 text-[11px] font-bold text-fog uppercase">
                    {t('mockInterview.avatarName')}
                  </div>
                  <div className="text-[15px] leading-normal font-bold text-ink">
                    {currentQuestion}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[15px] leading-normal font-bold text-ink">
                {atSessionLimit ? t('mockInterview.limitsNotice') : t('mockInterview.readyToStart')}
              </div>
            )}
            {recording && questionsAsked < QUESTIONS_PER_SESSION && (
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
          {skills.length > 0 && (
            <div className="mb-2.5 rounded-[9px] border border-border bg-surface p-3">
              <div className="mb-2 text-[12px] font-bold text-fog uppercase">
                {t('mockInterview.skillsForSession')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => {
                  const selected = selectedSkills.includes(skill)
                  return (
                    <button
                      key={skill}
                      type="button"
                      disabled={recording}
                      onClick={() => toggleSkillSelected(skill)}
                      aria-pressed={selected}
                      className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold disabled:opacity-60 ${
                        selected
                          ? 'border-primary bg-primary-tint text-primary'
                          : 'border-border bg-surface text-fog line-through'
                      }`}
                    >
                      {skill}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {autoStopped && !uploadError && (
            <p className="mb-2.5 text-[13px] font-semibold text-amber">
              {t('mockInterview.autoStopped')}
            </p>
          )}
          {uploadError && (
            <p className="mb-2.5 text-[13px] font-semibold text-danger">{uploadError}</p>
          )}
          <button
            type="button"
            onClick={() => (recording ? handleStop() : void handleStart())}
            disabled={uploading || (!recording && atSessionLimit)}
            className="w-full rounded-[9px] bg-ink py-[11px] text-sm font-bold text-white disabled:opacity-60"
          >
            {uploading
              ? t('mockInterview.uploading')
              : recording
                ? t('mockInterview.stopAndSave')
                : t('mockInterview.startNewSession')}
          </button>
          {!recording && lastQuestionSet.length > 0 && !atSessionLimit && (
            <button
              type="button"
              onClick={() => void handleStart(true)}
              disabled={uploading}
              className="mt-2 w-full rounded-[9px] border border-border py-[11px] text-sm font-bold text-ink disabled:opacity-60"
            >
              {t('mockInterview.repeatLastSession')}
            </button>
          )}
        </div>
      </div>

      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-base font-bold text-ink">{t('mockInterview.recordedLogs')}</h2>
        <span className="text-[13px] text-fog">
          {t('mockInterview.sessionsCount', { count: sessions.length, max: MAX_SESSIONS })}
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
            <div
              key={session.id}
              className="overflow-hidden rounded-card border border-border bg-surface"
            >
              <button
                type="button"
                onClick={() => handleWatch(session.id)}
                aria-label={t('mockInterview.watch')}
                className="relative flex aspect-video w-full items-center justify-center bg-neutral-tint bg-cover bg-center"
                style={
                  thumbnailUrls[session.id]
                    ? { backgroundImage: `url(${thumbnailUrls[session.id]})` }
                    : undefined
                }
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(20,24,31,0.7)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="absolute right-2 bottom-2 rounded bg-[rgba(20,24,31,0.7)] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {formatDuration(session.durationSeconds)}
                </span>
              </button>
              <div className="flex items-start justify-between gap-2 p-3.5">
                <div className="min-w-0">
                  <div className="mb-0.5 truncate text-sm font-bold text-ink">
                    {session.category}
                  </div>
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
                <button
                  type="button"
                  onClick={() => handleDelete(session.id)}
                  disabled={deletingId === session.id}
                  aria-label={t('mockInterview.delete')}
                  className="shrink-0 rounded-lg border border-[#FCA5A5] px-2.5 py-1.5 text-[12px] font-bold text-danger disabled:opacity-50"
                >
                  {t('mockInterview.delete')}
                </button>
              </div>
            </div>
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
