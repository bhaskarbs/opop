import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { ROUTES } from '../../routes/paths'
import type { DisplayJob } from './jobDisplay'

export function ResultCard({ job, applied = false }: { job: DisplayJob; applied?: boolean }) {
  const { t } = useTranslation('public')
  const localize = useLocalizedPath()

  return (
    <Card className={applied ? 'border-2 border-teal bg-teal-tint p-5' : 'p-5'}>
      <div className="flex gap-4">
        <div
          className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] text-[16px] font-bold text-white ${job.avatarColorClass}`}
        >
          {job.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={localize(ROUTES.jobDetail(job.id))}
              className="text-[16.5px] font-bold text-ink no-underline"
            >
              {job.title}
            </Link>
            {applied && (
              <span className="rounded-full bg-teal px-2.5 py-[3px] text-[11px] font-bold text-white">
                {t('resultCard.applied')}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm text-slate">
            {job.company} · {job.location}
          </div>
          <div className="my-3 flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-tint px-2.5 py-1 text-[12px] font-semibold text-[#3A414D]"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-[13.5px] text-slate">
              {job.salary} · {job.postedLabel} ·{' '}
              <span className={`font-semibold ${job.sourceColorClass}`}>{job.source}</span>
            </div>
            <Link
              to={localize(ROUTES.jobDetail(job.id))}
              className={
                applied
                  ? 'rounded-lg border border-teal bg-surface px-[18px] py-2.5 text-[13.5px] font-bold text-teal no-underline'
                  : 'rounded-lg bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-white no-underline'
              }
            >
              {applied ? t('resultCard.viewDetails') : t('resultCard.applyNow')}
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
