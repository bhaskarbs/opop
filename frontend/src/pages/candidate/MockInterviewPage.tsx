import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingState, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { experienceLevelFromBackend } from '../../lib/jobEnums'
import type { BackendExperienceLevel } from '../../lib/jobsApi'
import {
  mockInterviewApi,
  type MockInterviewQuestionDifficulty,
  type MockInterviewSessionQuestion,
  type MockInterviewSessionSummary,
} from '../../lib/mockInterviewApi'
import { useCandidateProfileStore } from '../../stores/candidateProfileStore'

// Questions are generated per-session by the backend via the Claude API (see
// mockInterviewApi.generateQuestions), tailored to the candidate's selected skills, experience
// level, and industry, already ordered easy to very difficult with skills attached per question.
// QUESTION_TEMPLATES/FALLBACK_QUESTIONS below are the local fallback used only when that call
// fails (no API key configured, network error, rate limit, etc.) — see fetchSessionQuestions —
// so a candidate can always start a session; they mirror the same easy-to-very-difficult
// ordering and per-question skill tagging the backend provides.
const FALLBACK_QUESTIONS: Array<{ text: string; difficulty: MockInterviewQuestionDifficulty }> = [
  { text: 'Tell me about yourself.', difficulty: 'EASY' },
  { text: 'Where do you see yourself in three years?', difficulty: 'EASY' },
  { text: 'How do you prioritize when you have multiple deadlines at once?', difficulty: 'NORMAL' },
  { text: 'What’s a piece of feedback that changed how you work?', difficulty: 'NORMAL' },
  {
    text: 'Describe a situation where you disagreed with a teammate’s decision. How did you handle it?',
    difficulty: 'DIFFICULT',
  },
  { text: 'Walk me through a project you’re proud of, end to end.', difficulty: 'DIFFICULT' },
  {
    text: 'Tell me about a time you had to debug a difficult production issue. What was your process?',
    difficulty: 'VERY_DIFFICULT',
  },
  {
    text: 'Describe a time you had to learn something new under time pressure.',
    difficulty: 'VERY_DIFFICULT',
  },
]

const QUESTIONS_PER_SESSION = 8
// Flat across every plan — mirrors MockInterviewService.MAX_SESSIONS on the backend, kept as a
// plain client-side constant rather than a dedicated endpoint since the backend is the actual
// source of truth/enforcement either way.
const MAX_SESSIONS = 3
const MAX_DURATION_SECONDS = 20 * 60

type TemplateInput = 'skill' | 'experienceLevel' | 'industry'

interface QuestionTemplate {
  text: string
  // Every listed input must have a real value for this template to be eligible — lets richer,
  // more specific questions surface once the candidate has filled in experience/industry,
  // without ever blocking on skill alone (see QUESTION_TEMPLATES below).
  requires: TemplateInput[]
  difficulty: MockInterviewQuestionDifficulty
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    text: 'Tell me about a time you used {{skill}} to solve a challenging problem.',
    requires: ['skill'],
    difficulty: 'EASY',
  },
  {
    text: 'How would you explain {{skill}} to someone with no technical background?',
    requires: ['skill'],
    difficulty: 'EASY',
  },
  {
    text: 'How do you stay current with {{skill}}?',
    requires: ['skill'],
    difficulty: 'EASY',
  },
  {
    text: 'Describe a project where {{skill}} was critical to the outcome.',
    requires: ['skill'],
    difficulty: 'NORMAL',
  },
  {
    text: 'What’s a mistake you made while working with {{skill}}, and what did you learn from it?',
    requires: ['skill'],
    difficulty: 'NORMAL',
  },
  {
    text: 'How is {{skill}} typically applied in the {{industry}} industry?',
    requires: ['skill', 'industry'],
    difficulty: 'NORMAL',
  },
  {
    text: 'What’s the hardest part of working with {{skill}}, in your experience?',
    requires: ['skill'],
    difficulty: 'DIFFICULT',
  },
  {
    text: 'As a {{experienceLevel}} professional, how would you approach a {{skill}} challenge?',
    requires: ['skill', 'experienceLevel'],
    difficulty: 'DIFFICULT',
  },
  {
    text: 'What unique challenges does the {{industry}} industry present when applying {{skill}}?',
    requires: ['skill', 'industry'],
    difficulty: 'DIFFICULT',
  },
  {
    text: 'How has your approach to {{skill}} evolved as you’ve grown into a {{experienceLevel}} role?',
    requires: ['skill', 'experienceLevel'],
    difficulty: 'VERY_DIFFICULT',
  },
  {
    text: 'As a {{experienceLevel}} candidate working in {{industry}}, how have you used {{skill}} to deliver results?',
    requires: ['skill', 'experienceLevel', 'industry'],
    difficulty: 'VERY_DIFFICULT',
  },
]

const DIFFICULTY_TIERS: MockInterviewQuestionDifficulty[] = [
  'EASY',
  'NORMAL',
  'DIFFICULT',
  'VERY_DIFFICULT',
]

// MediaRecorder picks whichever mimeType the browser actually supports; Chrome/Firefox/Edge
// all support webm/vp8+opus.
const RECORDER_MIME_TYPE = 'video/webm;codecs=vp8,opus'

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

/** Spreads `count` questions evenly across the four difficulty tiers in ascending order, e.g.
 * for 8 questions: [EASY, EASY, NORMAL, NORMAL, DIFFICULT, DIFFICULT, VERY_DIFFICULT,
 * VERY_DIFFICULT] — mirrors what the backend prompt asks Claude for (see
 * MockInterviewQuestionService.buildPrompt). */
function difficultyProgression(count: number): MockInterviewQuestionDifficulty[] {
  return Array.from(
    { length: count },
    (_, index) =>
      DIFFICULTY_TIERS[
        Math.min(DIFFICULTY_TIERS.length - 1, Math.floor((index / count) * DIFFICULTY_TIERS.length))
      ]!,
  )
}

function fillTemplate(
  template: QuestionTemplate,
  skill: string,
  experienceLevel: string | null,
  industry: string | null,
): MockInterviewSessionQuestion {
  return {
    text: template.text
      .replace('{{skill}}', skill)
      .replace('{{experienceLevel}}', (experienceLevel ?? '').toLowerCase())
      .replace('{{industry}}', industry ?? ''),
    skills: [skill],
    difficulty: template.difficulty,
  }
}

/** One question for a given difficulty tier — skill-based (and tagged with the skill it used,
 * for MockInterviewPage to highlight) whenever the candidate has selected at least one skill,
 * enriched with experience level and/or industry once those are filled in on the candidate's
 * profile (see QUESTION_TEMPLATES' `requires`). Falls back to a flat canned question pool tagged
 * with no skill when no skills are selected, or when no template of this tier is eligible.
 * Avoids repeating a question already used earlier in the same session where it reasonably can. */
function pickQuestionForTier(
  tier: MockInterviewQuestionDifficulty,
  skills: string[],
  experienceLevel: string | null,
  industry: string | null,
  usedTexts: Set<string>,
): MockInterviewSessionQuestion {
  const available: Record<TemplateInput, boolean> = {
    skill: skills.length > 0,
    experienceLevel: !!experienceLevel,
    industry: !!industry,
  }
  const eligibleTemplates = QUESTION_TEMPLATES.filter(
    (template) =>
      template.difficulty === tier && template.requires.every((input) => available[input]),
  )

  if (eligibleTemplates.length > 0) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = fillTemplate(
        pickRandom(eligibleTemplates),
        pickRandom(skills),
        experienceLevel,
        industry,
      )
      if (!usedTexts.has(candidate.text)) return candidate
    }
    return fillTemplate(eligibleTemplates[0]!, skills[0]!, experienceLevel, industry)
  }

  const eligibleFallbacks = FALLBACK_QUESTIONS.filter((question) => question.difficulty === tier)
  const pool = eligibleFallbacks.length > 0 ? eligibleFallbacks : FALLBACK_QUESTIONS
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = pickRandom(pool)
    if (!usedTexts.has(candidate.text))
      return { text: candidate.text, skills: [], difficulty: candidate.difficulty }
  }
  return { text: pool[0]!.text, skills: [], difficulty: pool[0]!.difficulty }
}

/** The full local-fallback session, already in easy-to-very-difficult order. */
function generateLocalSessionQuestions(
  skills: string[],
  experienceLevel: string | null,
  industry: string | null,
): MockInterviewSessionQuestion[] {
  const usedTexts = new Set<string>()
  return difficultyProgression(QUESTIONS_PER_SESSION).map((tier) => {
    const question = pickQuestionForTier(tier, skills, experienceLevel, industry, usedTexts)
    usedTexts.add(question.text)
    return question
  })
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
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [experienceLevel, setExperienceLevel] = useState<BackendExperienceLevel | null>(null)
  const [industry, setIndustry] = useState<string | null>(null)
  const [lastQuestionSet, setLastQuestionSet] = useState<MockInterviewSessionQuestion[]>([])

  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentQuestionSkills, setCurrentQuestionSkills] = useState<string[]>([])
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [avatarSpeaking, setAvatarSpeaking] = useState(false)
  const [recording, setRecording] = useState(false)
  const [hasStream, setHasStream] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [preparingQuestions, setPreparingQuestions] = useState(false)
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
  const sessionQuestionsRef = useRef<MockInterviewSessionQuestion[]>([])
  const preparedQuestionsRef = useRef<MockInterviewSessionQuestion[]>([])

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
    useCandidateProfileStore
      .getState()
      .fetchProfile()
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

  /** Asks Claude (via the backend) for this session's full question set, tailored to the
   * candidate's selected skills, experience level, and industry. Falls back to the local
   * template generator — silently, per product decision — if that call fails for any reason
   * (no API key configured server-side, network error, rate limit), so a candidate can always
   * start a session. */
  async function fetchSessionQuestions(): Promise<MockInterviewSessionQuestion[]> {
    try {
      const result = await mockInterviewApi.generateQuestions({
        skills: selectedSkills,
        experienceLevel,
        industry,
        count: QUESTIONS_PER_SESSION,
      })
      if (result.questions.length > 0) return result.questions
    } catch {
      // LLM unavailable — fall through to the local generator below.
    }
    const resolvedExperienceLevel = experienceLevel
      ? experienceLevelFromBackend(experienceLevel)
      : null
    return generateLocalSessionQuestions(selectedSkills, resolvedExperienceLevel, industry)
  }

  function askQuestion() {
    const index = questionsAskedRef.current
    const question = preparedQuestionsRef.current[index] ??
      preparedQuestionsRef.current[preparedQuestionsRef.current.length - 1] ?? {
        text: '',
        skills: [],
        difficulty: null,
      }
    setCurrentQuestion(question.text)
    setCurrentQuestionSkills(question.skills)
    sessionQuestionsRef.current.push(question)
    questionsAskedRef.current += 1
    setQuestionsAsked(questionsAskedRef.current)
    speakQuestion(
      question.text,
      () => setAvatarSpeaking(true),
      () => setAvatarSpeaking(false),
    )
  }

  async function handleStart(repeat = false) {
    if (sessions.length >= MAX_SESSIONS) return
    setCameraError(null)
    setUploadError(null)
    setAutoStopped(false)
    sessionQuestionsRef.current = []

    setPreparingQuestions(true)
    try {
      preparedQuestionsRef.current = repeat ? lastQuestionSet : await fetchSessionQuestions()
    } finally {
      setPreparingQuestions(false)
    }

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
        askQuestion()
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
    askQuestion()
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

  async function handleToggleVisibility(session: MockInterviewSessionSummary) {
    setVisibilityUpdatingId(session.id)
    try {
      const updated = await mockInterviewApi.updateVisibility(
        session.id,
        !session.visibleToCompanies,
      )
      setSessions((prev) =>
        prev.map((existing) => (existing.id === session.id ? updated : existing)),
      )
    } catch (caught) {
      setUploadError(
        caught instanceof ApiError ? caught.message : t('mockInterview.visibilityError'),
      )
    } finally {
      setVisibilityUpdatingId(null)
    }
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
      <p className="mb-6 text-[13px] text-fog">
        {t('mockInterview.limitsNotice', { max: MAX_SESSIONS })}
      </p>

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
                  {currentQuestionSkills.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {currentQuestionSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-bold text-primary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[15px] leading-normal font-bold text-ink">
                {atSessionLimit
                  ? t('mockInterview.limitsNotice', { max: MAX_SESSIONS })
                  : t('mockInterview.readyToStart')}
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
            disabled={uploading || preparingQuestions || (!recording && atSessionLimit)}
            className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-ink py-[11px] text-sm font-bold text-white disabled:opacity-60"
          >
            {(uploading || preparingQuestions) && <Spinner className="h-4 w-4" />}
            {uploading
              ? t('mockInterview.uploading')
              : preparingQuestions
                ? t('mockInterview.preparingQuestions')
                : recording
                  ? t('mockInterview.stopAndSave')
                  : t('mockInterview.startNewSession')}
          </button>
          {!recording && lastQuestionSet.length > 0 && !atSessionLimit && (
            <button
              type="button"
              onClick={() => void handleStart(true)}
              disabled={uploading || preparingQuestions}
              className="mt-2 w-full rounded-[9px] border border-border py-[11px] text-sm font-bold text-ink disabled:opacity-60"
            >
              {t('mockInterview.repeatLastSession')}
            </button>
          )}
        </div>
      </div>

      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-base font-bold text-ink">{t('mockInterview.recordedLogs')}</h2>
        <span className="text-[13px] text-fog">
          {t('mockInterview.sessionsCount', { count: sessions.length, max: MAX_SESSIONS })}
        </span>
      </div>
      <p className="mb-3.5 text-[12.5px] text-fog">{t('mockInterview.visibilityNotice')}</p>
      {playbackError && (
        <p className="mb-3 text-[13px] font-semibold text-danger">{playbackError}</p>
      )}
      {sessionsLoading ? (
        <div className="rounded-card border border-border bg-surface p-10">
          <LoadingState message={t('mockInterview.loadingSessions')} />
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
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink">
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
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#FCA5A5] px-2.5 py-1.5 text-[12px] font-bold text-danger disabled:opacity-50"
                  >
                    {deletingId === session.id && <Spinner className="h-3 w-3" />}
                    {t('mockInterview.delete')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(session)}
                  disabled={visibilityUpdatingId === session.id}
                  aria-pressed={session.visibleToCompanies}
                  className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-bold disabled:opacity-50 ${
                    session.visibleToCompanies
                      ? 'border-teal bg-teal-tint text-teal'
                      : 'border-border bg-surface text-slate'
                  }`}
                >
                  {visibilityUpdatingId === session.id && <Spinner className="h-3 w-3" />}
                  {session.visibleToCompanies
                    ? t('mockInterview.visibleToCompanies')
                    : t('mockInterview.hiddenFromCompanies')}
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
