import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/apiClient'
import { adminApi } from '../../lib/adminApi'
import type { JobSummary } from '../../lib/jobsApi'
import { workModeFromBackend } from '../../lib/jobEnums'

function formatSubmittedLabel(createdAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export default function AdminJobApprovalsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi
      .pendingJobs()
      .then((result) => {
        if (!cancelled) setJobs(result)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Could not load pending jobs.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleApprove(jobId: string) {
    setActioningId(jobId)
    try {
      await adminApi.approveJob(jobId)
      setJobs((prev) => prev.filter((job) => job.id !== jobId))
    } catch {
      // Best-effort — the job simply stays in the pending list if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  async function handleReject(jobId: string) {
    setActioningId(jobId)
    try {
      await adminApi.rejectJob(jobId)
      setJobs((prev) => prev.filter((job) => job.id !== jobId))
    } catch {
      // Best-effort — the job simply stays in the pending list if the call fails.
    } finally {
      setActioningId(null)
    }
  }

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-7 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-extrabold text-ink">Job approvals</h1>
          <p className="text-sm text-slate">Review new job postings before they go live.</p>
        </div>
        <div className="rounded-full bg-amber-tint px-3.5 py-1.5 text-[13.5px] font-bold text-amber">
          {jobs.length} pending review
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDECEC] px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          Loading pending jobs…
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-slate">
          No jobs are waiting for review.
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-card border border-border bg-surface p-[22px]">
              <div className="mb-3.5 flex flex-wrap justify-between gap-4">
                <div className="flex gap-3.5">
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-primary-tint">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2451D6"
                      strokeWidth={2}
                    >
                      <path d="M3 7h18v13H3zM3 7l9-4 9 4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15.5px] font-bold text-ink">{job.title}</span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-slate">
                      {job.companyName} · {job.location} · {workModeFromBackend(job.workMode)} ·
                      Submitted {formatSubmittedLabel(job.createdAt)}
                    </div>
                  </div>
                </div>
                <span className="h-fit rounded-full bg-amber-tint px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-amber">
                  Pending review
                </span>
              </div>

              {job.skills.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-neutral-tint px-2.5 py-1 text-[12px] font-semibold text-[#3A414D]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={actioningId === job.id}
                  onClick={() => handleApprove(job.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-teal px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-60"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Approve
                </button>
                <button
                  type="button"
                  disabled={actioningId === job.id}
                  onClick={() => handleReject(job.id)}
                  className="rounded-lg border border-[#FCA5A5] bg-surface px-5 py-2.5 text-[13.5px] font-bold text-danger disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
