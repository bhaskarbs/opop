import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { API_BASE_URL } from '../../lib/apiClient'
import { ROUTES } from '../../routes/paths'
import type { DisplayJob } from './jobDisplay'

export function ResultCard({
  job,
  applied = false,
  saved,
  onToggleSave,
}: {
  job: DisplayJob
  applied?: boolean
  // Both omitted on pages that don't track saved state (e.g. an anonymous visitor's search
  // results) — the bookmark button only renders when a caller actually wires it up.
  saved?: boolean
  onToggleSave?: () => void
}) {
  const { t } = useTranslation('public')
  const localize = useLocalizedPath()

  return (
    <Card className={`relative ${applied ? 'border-2 border-teal bg-teal-tint p-5' : 'p-5'}`}>
      {onToggleSave && (
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={t(saved ? 'resultCard.unsave' : 'resultCard.save')}
          aria-pressed={saved}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-fog hover:bg-neutral-tint hover:text-ink"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
            className={saved ? 'text-primary' : undefined}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      <div className="flex gap-4">
        {job.companyLogoUrl ? (
          <img
            src={`${API_BASE_URL}${job.companyLogoUrl}`}
            alt={job.company}
            className="h-[46px] w-[46px] shrink-0 rounded-[10px] object-cover"
          />
        ) : (
          <div
            className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] text-[16px] font-bold text-white ${job.avatarColorClass}`}
          >
            {job.initial}
          </div>
        )}
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
            {job.isFeatured && (
              <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-primary">
                {t('resultCard.featuredBadge')}
              </span>
            )}
            {job.isPromoted && (
              <span className="rounded-full bg-amber-tint px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-amber">
                {t('resultCard.promotedBadge')}
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
