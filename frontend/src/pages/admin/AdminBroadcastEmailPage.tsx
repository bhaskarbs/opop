import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import { adminApi } from '../../lib/adminApi'

// Splits on commas and/or newlines so pasting either a comma-separated list or one address per
// line both work — trims and drops blank entries, but doesn't validate format here (the backend
// is the source of truth for that; this is just for the live recipient count).
function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export default function AdminBroadcastEmailPage() {
  const { t } = useTranslation('admin')

  const [subject, setSubject] = useState('')
  const [recipientsText, setRecipientsText] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentCount, setSentCount] = useState<number | null>(null)

  const recipients = parseRecipients(recipientsText)

  async function handleSend() {
    setError(null)
    setSentCount(null)
    setSending(true)
    try {
      const result = await adminApi.sendBroadcastEmail({ subject, recipients, message })
      setSentCount(result.recipientCount)
      setSubject('')
      setRecipientsText('')
      setMessage('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('broadcastEmail.error'))
    } finally {
      setSending(false)
    }
  }

  const canSend = subject.trim() !== '' && recipients.length > 0 && message.trim() !== ''

  return (
    <main className="mx-auto max-w-[720px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('broadcastEmail.title')}</h1>
      <p className="mb-6 text-sm text-slate">{t('broadcastEmail.subtitle')}</p>

      <Card className="p-[26px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label htmlFor="broadcast-subject" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('broadcastEmail.subjectField')}
            </label>
            <input
              id="broadcast-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="broadcast-recipients" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('broadcastEmail.recipientsField')}
            </label>
            <textarea
              id="broadcast-recipients"
              value={recipientsText}
              onChange={(event) => setRecipientsText(event.target.value)}
              rows={4}
              placeholder={t('broadcastEmail.recipientsPlaceholder')}
              className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
            <span className="mt-1.5 text-[12.5px] text-fog">
              {t('broadcastEmail.recipientCount', { count: recipients.length })}
            </span>
          </div>

          <div className="flex flex-col">
            <label htmlFor="broadcast-message" className="mb-1.5 text-[13px] font-bold text-ink">
              {t('broadcastEmail.messageField')}
            </label>
            <textarea
              id="broadcast-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={10}
              placeholder={t('broadcastEmail.messagePlaceholder')}
              className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
            <span className="mt-1.5 text-[12.5px] text-fog">
              {t('broadcastEmail.templateNote')}
            </span>
          </div>

          {error && <p className="text-[13px] text-danger">{error}</p>}
          {sentCount != null && (
            <p className="text-[13px] text-teal">
              {t('broadcastEmail.success', { count: sentCount })}
            </p>
          )}

          <Button type="button" onClick={handleSend} loading={sending} disabled={!canSend}>
            {t('broadcastEmail.send')}
          </Button>
        </div>
      </Card>
    </main>
  )
}
