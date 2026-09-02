import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, LoadingState, Modal, Spinner } from '../../components/ui'
import { ApiError } from '../../lib/apiClient'
import {
  adminVideoApi,
  type AdminSharedVideoSummary,
  type AdminVideoShareSummary,
} from '../../lib/adminVideoApi'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Reads the file's own duration client-side (a hidden <video> element + loadedmetadata) before
// it's ever uploaded — the backend has no way to inspect video metadata itself (no ffprobe-
// equivalent in this stack), so this is the only place that number can come from.
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(Number.isFinite(video.duration) ? video.duration : null)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      resolve(null)
    }
    video.src = URL.createObjectURL(file)
  })
}

export default function AdminVideosPage() {
  const { t } = useTranslation('admin')

  const [videos, setVideos] = useState<AdminSharedVideoSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingDuration, setPendingDuration] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [shareModalVideoId, setShareModalVideoId] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sharingVideo, setSharingVideo] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null)

  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)
  const [shares, setShares] = useState<AdminVideoShareSummary[]>([])
  const [sharesLoading, setSharesLoading] = useState(false)
  const [deletingShareId, setDeletingShareId] = useState<string | null>(null)
  // Which share's link was most recently copied — drives a transient "Copied" label on that
  // row's button only, not a page-wide toast.
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminVideoApi
      .list()
      .then((result) => {
        if (!cancelled) setVideos(result)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : t('videos.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPendingFile(file)
    setTitle(file.name)
    setUploadError(null)
    const duration = await readVideoDuration(file)
    setPendingDuration(duration)
  }

  async function handleUpload() {
    if (!pendingFile) return
    setUploadError(null)
    setUploading(true)
    try {
      const created = await adminVideoApi.upload(pendingFile, title, pendingDuration)
      setVideos((previous) => [created, ...previous])
      setPendingFile(null)
      setPendingDuration(null)
      setTitle('')
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : t('videos.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await adminVideoApi.delete(id)
      setVideos((previous) => previous.filter((video) => video.id !== id))
      if (expandedVideoId === id) setExpandedVideoId(null)
    } catch {
      // Best-effort — the row just stays put if the delete failed, and the button re-enables.
    } finally {
      setDeletingId(null)
    }
  }

  function openShareModal(videoId: string) {
    setShareModalVideoId(videoId)
    setRecipientName('')
    setRecipientEmail('')
    setShareError(null)
    setCreatedShareUrl(null)
  }

  async function handleCreateShare() {
    if (!shareModalVideoId) return
    setShareError(null)
    setSharingVideo(true)
    try {
      const share = await adminVideoApi.createShare(shareModalVideoId, {
        recipientName,
        recipientEmail,
      })
      setCreatedShareUrl(share.shareUrl)
      setVideos((previous) =>
        previous.map((video) =>
          video.id === shareModalVideoId ? { ...video, shareCount: video.shareCount + 1 } : video,
        ),
      )
      if (expandedVideoId === shareModalVideoId) {
        setShares((previous) => [share, ...previous])
      }
    } catch (error) {
      setShareError(error instanceof ApiError ? error.message : t('videos.shareError'))
    } finally {
      setSharingVideo(false)
    }
  }

  async function handleDeleteShare(videoId: string, shareId: string) {
    setDeletingShareId(shareId)
    try {
      await adminVideoApi.deleteShare(videoId, shareId)
      setShares((previous) => previous.filter((share) => share.id !== shareId))
      setVideos((previous) =>
        previous.map((video) =>
          video.id === videoId ? { ...video, shareCount: video.shareCount - 1 } : video,
        ),
      )
    } catch {
      // Best-effort — the row just stays put if the delete failed, and the button re-enables.
    } finally {
      setDeletingShareId(null)
    }
  }

  async function handleCopyShareUrl(shareId: string, shareUrl: string) {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedShareId(shareId)
      setTimeout(() => setCopiedShareId((current) => (current === shareId ? null : current)), 2000)
    } catch {
      // Best-effort — the URL is still visible/selectable in the row for a manual copy.
    }
  }

  async function toggleShares(videoId: string) {
    if (expandedVideoId === videoId) {
      setExpandedVideoId(null)
      return
    }
    setExpandedVideoId(videoId)
    setSharesLoading(true)
    try {
      const result = await adminVideoApi.listShares(videoId)
      setShares(result)
    } catch {
      setShares([])
    } finally {
      setSharesLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[900px] px-6 py-7 pb-16">
        <LoadingState message={t('videos.loading')} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[900px] px-6 py-7 pb-16">
      <h1 className="mb-1 text-xl font-extrabold text-ink">{t('videos.title')}</h1>
      <p className="mb-6 text-sm text-slate">{t('videos.subtitle')}</p>

      {loadError && <p className="mb-4 text-[13px] text-danger">{loadError}</p>}

      <Card className="mb-6 p-[26px]">
        <h2 className="mb-3 text-base font-bold text-ink">{t('videos.uploadHeading')}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-bold text-ink"
          >
            {t('videos.chooseFile')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {pendingFile && (
            <span className="text-[12.5px] text-slate">
              {pendingFile.name} · {formatFileSize(pendingFile.size)}
              {pendingDuration != null && ` · ${formatDuration(Math.round(pendingDuration))}`}
            </span>
          )}
        </div>
        {pendingFile && (
          <div className="mt-3.5 flex flex-wrap items-end gap-3">
            <div className="flex flex-1 flex-col">
              <label htmlFor="video-title" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('videos.titleField')}
              </label>
              <input
                id="video-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
            </div>
            <Button type="button" onClick={handleUpload} loading={uploading}>
              {t('videos.upload')}
            </Button>
          </div>
        )}
        {uploadError && <p className="mt-3 text-[13px] text-danger">{uploadError}</p>}
      </Card>

      {videos.length === 0 ? (
        <p className="text-[13px] text-slate">{t('videos.empty')}</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {videos.map((video) => (
            <Card key={video.id} className="p-[22px]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[14.5px] font-bold text-ink">{video.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-fog">
                    {formatFileSize(video.sizeBytes)}
                    {video.durationSeconds != null && ` · ${formatDuration(video.durationSeconds)}`}
                    {' · '}
                    {t('videos.sharedCount', { count: video.shareCount })}
                    {' · '}
                    {formatDate(video.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleShares(video.id)}
                    className="rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-bold text-ink"
                  >
                    {expandedVideoId === video.id ? t('videos.hideShares') : t('videos.viewShares')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openShareModal(video.id)}
                    className="rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white"
                  >
                    {t('videos.share')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(video.id)}
                    disabled={deletingId === video.id}
                    className="rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-bold text-danger disabled:opacity-50"
                  >
                    {deletingId === video.id ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      t('videos.delete')
                    )}
                  </button>
                </div>
              </div>

              {expandedVideoId === video.id && (
                <div className="mt-4 border-t border-[#F0F1F3] pt-4">
                  {sharesLoading ? (
                    <Spinner className="h-4 w-4" />
                  ) : shares.length === 0 ? (
                    <p className="text-[12.5px] text-slate">{t('videos.noShares')}</p>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {shares.map((share) => (
                        <li
                          key={share.id}
                          className="flex flex-col gap-2 rounded-xl border border-border p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-[13px] font-bold text-ink">
                                {share.recipientName}
                              </div>
                              <div className="text-[12px] text-fog">{share.recipientEmail}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right text-[12px] text-slate">
                                <div>
                                  {share.watchedPercent != null
                                    ? t('videos.watchedPercent', { percent: share.watchedPercent })
                                    : t('videos.watchedSeconds', {
                                        seconds: share.maxWatchedSeconds,
                                      })}
                                </div>
                                <div className="text-fog">
                                  {t('videos.viewCount', { count: share.viewCount })}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteShare(video.id, share.id)}
                                disabled={deletingShareId === share.id}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-bold text-danger disabled:opacity-50"
                              >
                                {deletingShareId === share.id ? (
                                  <Spinner className="h-3 w-3" />
                                ) : (
                                  t('videos.deleteShare')
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 border-t border-[#F0F1F3] pt-2">
                            <a
                              href={share.shareUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="min-w-0 flex-1 truncate text-[12px] text-primary"
                            >
                              {share.shareUrl}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyShareUrl(share.id, share.shareUrl)}
                              className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11.5px] font-bold text-ink"
                            >
                              {copiedShareId === share.id
                                ? t('videos.linkCopied')
                                : t('videos.copyLink')}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={shareModalVideoId !== null}
        onClose={() => setShareModalVideoId(null)}
        closeLabel={t('videos.close')}
        title={t('videos.share')}
      >
        {createdShareUrl ? (
          <div className="flex flex-col gap-3.5">
            <p className="text-[13px] text-teal">{t('videos.shareSuccess')}</p>
            <div className="flex flex-col">
              <label htmlFor="share-url" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('videos.shareUrlField')}
              </label>
              <input
                id="share-url"
                readOnly
                value={createdShareUrl}
                onFocus={(event) => event.target.select()}
                className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => setShareModalVideoId(null)}>
              {t('videos.done')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col">
              <label htmlFor="recipient-name" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('videos.recipientNameField')}
              </label>
              <input
                id="recipient-name"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="recipient-email" className="mb-1.5 text-[13px] font-bold text-ink">
                {t('videos.recipientEmailField')}
              </label>
              <input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                className="rounded-control border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
            </div>
            {shareError && <p className="text-[13px] text-danger">{shareError}</p>}
            <Button
              type="button"
              onClick={handleCreateShare}
              loading={sharingVideo}
              disabled={!recipientName.trim() || !recipientEmail.trim()}
            >
              {t('videos.generateAndSend')}
            </Button>
          </div>
        )}
      </Modal>
    </main>
  )
}
