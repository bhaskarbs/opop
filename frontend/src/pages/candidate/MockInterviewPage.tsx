const RECORDINGS = [
  { title: 'Frontend behavioral round', date: 'Jul 2, 2026', duration: '18:42', questions: 8 },
  { title: 'System design practice', date: 'Jun 24, 2026', duration: '24:10', questions: 6 },
  { title: 'General soft skills', date: 'Jun 15, 2026', duration: '15:05', questions: 8 },
  { title: 'React deep dive', date: 'Jun 3, 2026', duration: '21:30', questions: 7 },
]

export default function MockInterviewPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-6 pt-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">Mock interviews</h1>
      <p className="mb-6 text-sm text-slate">
        Practice on camera, then review your recorded sessions anytime.
      </p>

      <div className="mb-9 grid grid-cols-1 gap-6 profile:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-footer">
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
            <div className="font-mono text-[12.5px]">[ camera preview ]</div>
          </div>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
            <button
              type="button"
              aria-label="Toggle microphone"
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#14181F"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Stop recording"
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-danger"
            >
              <span className="h-[18px] w-[18px] rounded bg-white" />
            </button>
            <button
              type="button"
              aria-label="Toggle camera"
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#14181F"
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
              Question 3 of 8
            </div>
            <div className="text-[15px] leading-normal font-bold text-ink">
              Tell me about a time you had to debug a difficult production issue. What was your
              process?
            </div>
          </div>
          <select
            className="mb-2.5 w-full rounded-[9px] border border-border bg-surface px-3 py-2.5 text-[13.5px] text-ink"
            defaultValue="Frontend Developer — behavioral"
          >
            <option>Frontend Developer — behavioral</option>
            <option>Frontend Developer — technical</option>
            <option>General soft skills</option>
          </select>
          <button
            type="button"
            className="w-full rounded-[9px] bg-ink py-[11px] text-sm font-bold text-white"
          >
            Start new session
          </button>
        </div>
      </div>

      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-base font-bold text-ink">Recorded logs</h2>
        <span className="text-[13px] text-fog">{RECORDINGS.length} sessions</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        {RECORDINGS.map((recording) => (
          <div
            key={recording.title}
            className="overflow-hidden rounded-card border border-border bg-surface"
          >
            <div className="relative flex aspect-video items-center justify-center bg-neutral-tint">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(20,24,31,0.7)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="absolute right-2 bottom-2 rounded bg-[rgba(20,24,31,0.7)] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {recording.duration}
              </span>
            </div>
            <div className="p-3.5">
              <div className="mb-0.5 text-sm font-bold text-ink">{recording.title}</div>
              <div className="text-[12.5px] text-fog">
                {recording.date} · {recording.questions} questions
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
