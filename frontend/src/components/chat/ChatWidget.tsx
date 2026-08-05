import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { ApiError } from '../../lib/apiClient'
import { chatApi, type ChatTurn } from '../../lib/chatApi'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'

/** Floating support-chat widget, mounted once in App.tsx (outside <Routes>) so it persists
 * across every page/layout and survives client-side navigation without losing the
 * conversation. Phase A only — plain Q&A, no tool-calling/actions (see backend ChatService) —
 * so there's nothing here yet beyond send-a-message/show-the-reply.
 *
 * <p>No Zustand store: the widget is mounted exactly once for the app's whole lifetime, so
 * local useState already persists across route changes on its own — a shared store would only
 * be needed if something outside this component also had to read/write chat state. */
export default function ChatWidget() {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [open, messages, sending])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const history = messages
    const withUserMessage: ChatTurn[] = [...history, { role: 'user', content: trimmed }]
    setMessages(withUserMessage)
    setInput('')
    setSending(true)
    setError(null)
    try {
      const response = await chatApi.send({ message: trimmed, history })
      setMessages([...withUserMessage, { role: 'assistant', content: response.reply }])
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 429 ? t('chat.rateLimited') : t('chat.error'),
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
        <button
          type="button"
          aria-label={t('chat.close')}
          onClick={() => setOpen(false)}
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
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          rows={1}
          className="max-h-24 flex-1 resize-none rounded-control border border-border bg-page px-3 py-2 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-primary"
        />
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
