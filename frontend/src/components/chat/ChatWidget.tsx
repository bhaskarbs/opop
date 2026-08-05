import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { ApiError } from '../../lib/apiClient'
import { chatApi, type ChatTurn } from '../../lib/chatApi'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'

// Web Speech API language tags are BCP-47 (e.g. "en-IN"), not the bare "en"/"hi" i18next uses.
// en-IN (not en-US) since OpenOpportunity's audience is India-based (INR/lakhs pricing, GSTIN/
// PAN company verification, Indian cities, Hindi locale) — recognition tuned for US English
// accents was a meaningfully worse fit here.
const SPEECH_LANG_BY_LOCALE: Record<string, string> = { en: 'en-IN', hi: 'hi-IN' }

/** Chat replies can contain markdown (bold, bullets) and links (e.g. search_jobs result URLs) —
 * fine to read on screen, but read literally aloud a URL becomes a string of gibberish read
 * character-by-character. Strips both down to plain sentences before handing text to
 * useSpeechSynthesis; this is purely a speech-formatting concern, not something the hook itself
 * needs to know about. */
function stripForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#]/g, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Floating support-chat widget, mounted once in App.tsx (outside <Routes>) so it persists
 * across every page/layout and survives client-side navigation without losing the
 * conversation. Backend tool-calling (search/post/apply/express-interest) was added in Phases
 * B/C (see ChatService); Phase D added voice input (a mic button dictates into the same text
 * box the person can already type into and review before sending, it doesn't bypass that review
 * step or auto-send). Phase E adds voice output — a header toggle that, once turned on, reads
 * each new assistant reply aloud via useSpeechSynthesis; off by default so audio never plays
 * without the person opting in first. Speech in either direction is stopped (never left running
 * in the background) whenever the other one starts, a new message is sent, or the widget closes.
 *
 * <p>No Zustand store: the widget is mounted exactly once for the app's whole lifetime, so
 * local useState already persists across route changes on its own — a shared store would only
 * be needed if something outside this component also had to read/write chat state. */
export default function ChatWidget() {
  const { t, i18n } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const speechLang = SPEECH_LANG_BY_LOCALE[i18n.language] ?? 'en-US'
  const speech = useSpeechRecognition({ lang: speechLang, onResult: setInput })
  const synthesis = useSpeechSynthesis({ lang: speechLang })

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [open, messages, sending])

  // useSpeechRecognition already recovers from silence-timeout restarts on its own — the only
  // error it still surfaces is not-allowed, a real permission block the person needs to go fix
  // in browser settings; derived at render time (not copied into state via an effect) since
  // it's fully determined by speech.error.
  const displayedError = error ?? (speech.error === 'not-allowed' ? t('chat.micNotAllowed') : null)

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    synthesis.stop()
    const history = messages
    const withUserMessage: ChatTurn[] = [...history, { role: 'user', content: trimmed }]
    setMessages(withUserMessage)
    setInput('')
    setSending(true)
    setError(null)
    try {
      const response = await chatApi.send({ message: trimmed, history })
      setMessages([...withUserMessage, { role: 'assistant', content: response.reply }])
      if (voiceOutputEnabled) synthesis.speak(stripForSpeech(response.reply))
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 429
          ? t('chat.rateLimited')
          : t('chat.error'),
      )
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label={t('chat.launcherLabel')}
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(560px,calc(100vh-2.5rem))] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-xl">
      <div className="flex items-start justify-between gap-2 bg-primary px-4 py-3 text-white">
        <div>
          <p className="text-sm font-bold">{t('chat.title')}</p>
          <p className="text-xs text-white/80">{t('chat.subtitle')}</p>
        </div>
        <div className="flex items-center gap-1">
          {synthesis.supported && (
            <button
              type="button"
              aria-label={voiceOutputEnabled ? t('chat.voiceOutputOff') : t('chat.voiceOutputOn')}
              aria-pressed={voiceOutputEnabled}
              onClick={() => {
                synthesis.stop()
                setVoiceOutputEnabled((enabled) => !enabled)
              }}
              className={cn(
                'rounded p-1 text-white/90 hover:bg-white/10',
                synthesis.speaking && 'animate-pulse',
              )}
            >
              {voiceOutputEnabled ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 9v6h4l5 4V5L8 9H4z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 9v6h4l5 4V5L8 9H4z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17 9l4 6M21 9l-4 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )}
          <button
            type="button"
            aria-label={t('chat.close')}
            onClick={() => {
              synthesis.stop()
              setOpen(false)
            }}
            className="rounded p-1 text-white/90 hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <ChatBubble role="assistant" content={t('chat.greeting')} />
        {messages.map((turn, index) => (
          <ChatBubble key={index} role={turn.role} content={turn.content} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-fog">
            <Spinner className="h-4 w-4" />
          </div>
        )}
        {displayedError && <p className="text-xs text-danger">{displayedError}</p>}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={speech.listening ? t('chat.listening') : t('chat.placeholder')}
          rows={1}
          className="max-h-24 flex-1 resize-none rounded-control border border-border bg-page px-3 py-2 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {speech.supported && (
          <button
            type="button"
            aria-label={speech.listening ? t('chat.micStop') : t('chat.micStart')}
            aria-pressed={speech.listening}
            onClick={() => {
              if (speech.listening) {
                speech.stop()
              } else {
                synthesis.stop()
                speech.start()
              }
            }}
            disabled={sending}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-control border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
              speech.listening
                ? 'animate-pulse border-danger bg-danger/10 text-danger'
                : 'border-border bg-page text-fog hover:text-ink',
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 11a7 7 0 0 1-14 0M12 18v3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSend()}
          loading={sending}
          disabled={!input.trim()}
        >
          {t('chat.send')}
        </Button>
      </div>
    </div>
  )
}

function ChatBubble({ role, content }: { role: ChatTurn['role']; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap rounded-card px-3 py-2 text-sm',
          isUser ? 'bg-primary text-white' : 'bg-page text-ink',
        )}
      >
        {content}
      </div>
    </div>
  )
}
