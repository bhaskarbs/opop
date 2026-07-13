import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

interface Seminar {
  title: string
  dateLabel: string
  mode: string
  attendees: string[]
  invited: number
}

const INITIAL_UPCOMING: Seminar[] = [
  {
    title: 'Partner intro session — Frontend',
    dateLabel: 'Jul 14, 4:00 PM',
    mode: 'Online video call',
    attendees: ['R', 'A', 'K'],
    invited: 22,
  },
  {
    title: 'Hardware QA meetup',
    dateLabel: 'Jul 21, 11:00 AM',
    mode: 'In-person · Bengaluru office',
    attendees: ['M', 'V'],
    invited: 12,
  },
]

const PAST_SESSIONS = [
  { title: 'Founding partner circle — Q2', date: 'Jun 18, 2026', attended: 14 },
  { title: 'Growth partner intro', date: 'May 30, 2026', attended: 9 },
]

const APPLICANTS = ['Rohan Mehta', 'Anita Sharma', 'Karan Patel']

const LABEL_CLASS = 'mb-1.5 block text-[13px] font-bold text-ink'
const INPUT_CLASS = 'w-full rounded-[9px] border border-border bg-surface text-ink'

function formatSessionDate(t: TFunction<'company'>, locale: string, date: string, time: string): string {
  if (!date) return t('seminars.dateTbd')
  const parsed = new Date(`${date}T${time || '09:00'}`)
  const day = parsed.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  const clock = parsed.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  return `${day}, ${clock}`
}

export default function SeminarSchedulerPage() {
  const { t, i18n } = useTranslation('company')
  const [upcoming, setUpcoming] = useState(INITIAL_UPCOMING)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [mode, setMode] = useState('Online video call')
  const [invitees, setInvitees] = useState<string[]>([])

  function handleSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    setUpcoming((sessions) => [
      ...sessions,
      {
        title: title.trim(),
        dateLabel: formatSessionDate(t, i18n.language, date, time),
        mode,
        attendees: invitees.map((name) => name.charAt(0)),
        invited: invitees.length,
      },
    ])
    setTitle('')
    setDate('')
    setTime('')
    setMode('Online video call')
    setInvitees([])
  }

  return (
    <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-6 px-6 pt-7 pb-16 header:grid-cols-[minmax(0,1fr)_300px]">
      <main>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2.5">
          <div>
            <h1 className="mb-1 text-xl font-extrabold text-ink">{t('seminars.title')}</h1>
            <p className="text-sm text-slate">{t('seminars.subtitle')}</p>
          </div>
        </div>

        <div className="mb-3.5 flex items-baseline justify-between">
          <h2 className="text-[15.5px] font-bold text-ink">{t('seminars.upcoming')}</h2>
        </div>
        <div className="mb-7 flex flex-col gap-3">
          {upcoming.map((seminar) => (
            <div
              key={seminar.title}
              className="flex flex-wrap justify-between gap-3.5 rounded-card border border-border bg-surface px-5 py-[18px]"
            >
              <div>
                <div className="text-[15px] font-bold text-ink">{seminar.title}</div>
                <div className="mt-0.5 text-[13px] text-slate">
                  {seminar.dateLabel} · {seminar.mode}
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  {seminar.attendees.map((initial, index) => (
                    <span
                      key={`${initial}-${index}`}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary-tint text-[11px] font-bold text-primary"
                    >
                      {initial}
                    </span>
                  ))}
                  <span className="ml-1 text-[12.5px] leading-[26px] text-fog">
                    {t('seminars.invitedCount', { count: seminar.invited })}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border bg-surface px-4 py-[9px] text-[13px] font-bold text-ink"
                >
                  {t('seminars.manageInvites')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-3.5 text-[15.5px] font-bold text-ink">{t('seminars.pastSessions')}</h2>
        <div className="flex flex-col gap-3">
          {PAST_SESSIONS.map((session) => (
            <div
              key={session.title}
              className="flex flex-wrap justify-between gap-3.5 rounded-card border border-border bg-surface px-5 py-4 opacity-85"
            >
              <div>
                <div className="text-[14.5px] font-bold text-ink">{session.title}</div>
                <div className="mt-0.5 text-[13px] text-slate">
                  {t('seminars.attendedCount', { date: session.date, count: session.attended })}
                </div>
              </div>
              <span className="h-fit rounded-full bg-neutral-tint px-2.5 py-1 text-xs font-semibold text-slate">
                {t('seminars.completed')}
              </span>
            </div>
          ))}
        </div>
      </main>

      <aside className="order-first header:order-none">
        <form
          onSubmit={handleSchedule}
          className="rounded-card border border-border bg-surface p-[22px]"
        >
          <h3 className="mb-4 text-[15px] font-bold text-ink">{t('seminars.scheduleNew')}</h3>
          <div className="mb-3.5">
            <label htmlFor="seminar-title" className={LABEL_CLASS}>
              {t('seminars.fields.title')}
            </label>
            <input
              id="seminar-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('seminars.fields.titlePlaceholder')}
              className={`${INPUT_CLASS} px-3 py-2.5 text-[13.5px]`}
            />
          </div>
          <div className="mb-3.5 grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="seminar-date" className={LABEL_CLASS}>
                {t('seminars.fields.date')}
              </label>
              <input
                id="seminar-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={`${INPUT_CLASS} px-2.5 py-[9px] text-[13px]`}
              />
            </div>
            <div>
              <label htmlFor="seminar-time" className={LABEL_CLASS}>
                {t('seminars.fields.time')}
              </label>
              <input
                id="seminar-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={`${INPUT_CLASS} px-2.5 py-[9px] text-[13px]`}
              />
            </div>
          </div>
          <div className="mb-3.5">
            <label htmlFor="seminar-mode" className={LABEL_CLASS}>
              {t('seminars.fields.mode')}
            </label>
            <select
              id="seminar-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className={`${INPUT_CLASS} px-3 py-2.5 text-[13.5px]`}
            >
              <option value="Online video call">{t('seminars.modes.onlineVideoCall')}</option>
              <option value="In-person meetup">{t('seminars.modes.inPersonMeetup')}</option>
            </select>
          </div>
          <div className="mb-[18px]">
            <label htmlFor="seminar-invitees" className={LABEL_CLASS}>
              {t('seminars.fields.inviteApplicants')}
            </label>
            <select
              id="seminar-invitees"
              multiple
              value={invitees}
              onChange={(event) =>
                setInvitees(Array.from(event.target.selectedOptions, (option) => option.value))
              }
              className={`${INPUT_CLASS} h-[92px] px-3 py-2.5 text-[13.5px]`}
            >
              {APPLICANTS.map((applicant) => (
                <option key={applicant}>{applicant}</option>
              ))}
            </select>
          </div>
          <div className="mb-4 rounded-[9px] bg-primary-tint px-3.5 py-3 text-[12.5px] leading-normal text-primary">
            {t('seminars.notifyNotice')}
          </div>
          <button
            type="submit"
            className="w-full rounded-[9px] bg-primary p-3 text-sm font-bold text-white"
          >
            {t('seminars.scheduleAndNotify')}
          </button>
        </form>
      </aside>
    </div>
  )
}
