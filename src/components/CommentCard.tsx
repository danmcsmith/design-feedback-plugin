import type { Comment } from '../types'

interface CommentCardProps {
  comment: Comment
}

export function CommentCard({ comment }: CommentCardProps) {
  const screenshotSrc = comment.screenshotPublicUrl ?? comment.screenshotDataUrl

  return (
    <div className="df-card">
      <div className="df-card__meta">
        <span className="df-card__author">{comment.authorName}</span>
        <span className="df-card__time" title={formatAbsolute(comment.timestamp)}>
          {formatRelative(comment.timestamp)}
        </span>
      </div>
      <p className="df-card__text">{comment.text}</p>
      {screenshotSrc && (
        <div
          className="df-card__screenshot"
          onClick={() => window.open(screenshotSrc, '_blank')}
          title="Open screenshot"
        >
          <img src={screenshotSrc} alt="Screenshot" loading="lazy" />
        </div>
      )}
      <SyncBadge status={comment.syncStatus} error={comment.errorMessage} />
    </div>
  )
}

function SyncBadge({ status, error }: { status: Comment['syncStatus']; error?: string }) {
  if (status === 'local') {
    return <span className="df-badge df-badge--local">Local</span>
  }
  if (status === 'syncing') {
    return <span className="df-badge df-badge--syncing">Syncing…</span>
  }
  if (status === 'synced') {
    return <span className="df-badge df-badge--synced">✓ Notion</span>
  }
  return (
    <span className="df-badge df-badge--error" title={error}>
      Sync failed
    </span>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
