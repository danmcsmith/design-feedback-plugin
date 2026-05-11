import { useState, useRef, useEffect } from 'react'
import { EmojiPickerPortal } from './EmojiPickerPortal'
import type { Comment, Reply } from '../types'
import { cn } from '../lib/utils'
import { getTagColor } from '../lib/tagColors'
import { loadAllTags, loadAuthorName, saveAuthorName } from '../storage'


interface CommentCardProps {
  comment: Comment
  onReply: (commentId: string, authorName: string, text: string) => void
  onReactToComment: (commentId: string, emoji: string) => void
  onReactToReply: (commentId: string, replyId: string, emoji: string) => void
}

export function CommentCard({ comment, onReply, onReactToComment, onReactToReply }: CommentCardProps) {
  const screenshotSrc = comment.screenshotPublicUrl ?? comment.screenshotDataUrl
  const allTags = loadAllTags()
  const currentUser = loadAuthorName()

  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyName, setReplyName] = useState(loadAuthorName)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (showReplyForm) textareaRef.current?.focus()
  }, [showReplyForm])

  function handleSubmitReply() {
    if (!replyText.trim() || !replyName.trim()) return
    saveAuthorName(replyName.trim())
    onReply(comment.id, replyName.trim(), replyText.trim())
    setReplyText('')
    setShowReplyForm(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSubmitReply() }
    if (e.key === 'Escape') { e.stopPropagation(); setShowReplyForm(false); setReplyText('') }
  }

  return (
    <div className="df-border-b df-border-gray-100 df-bg-white df-p-4 last:df-border-0">
      {/* Header */}
      <div className="df-mb-1.5 df-flex df-items-baseline df-justify-between df-gap-2">
        <span className="df-text-sm df-font-semibold df-text-gray-900">{comment.authorName}</span>
        <span className="df-shrink-0 df-text-xs df-text-gray-400" title={formatAbsolute(comment.timestamp)}>
          {formatRelative(comment.timestamp)}
        </span>
      </div>

      {/* Tags */}
      {comment.tags?.length > 0 && (
        <div className="df-mb-2 df-flex df-flex-wrap df-gap-1">
          {comment.tags.map((tag) => {
            const idx = allTags.indexOf(tag)
            const color = getTagColor(idx >= 0 ? idx : 0)
            return (
              <span
                key={tag}
                className={cn(
                  'df-inline-flex df-items-center df-gap-1.5 df-rounded df-px-2 df-py-0.5 df-text-xs df-font-medium',
                  color.bg, color.text,
                )}
              >
                <span className={cn('df-h-1.5 df-w-1.5 df-rounded-full df-flex-shrink-0', color.dot)} />
                {tag}
              </span>
            )
          })}
        </div>
      )}

      {/* Body */}
      <p className="df-text-sm df-leading-relaxed df-text-gray-700">{comment.text}</p>

      {/* Screenshot */}
      {screenshotSrc && (
        <div
          className="df-mt-2.5 df-cursor-pointer df-overflow-hidden df-rounded-lg df-border df-border-gray-200 df-bg-gray-50 hover:df-border-indigo-400"
          onClick={() => window.open(screenshotSrc, '_blank')}
          title="Open screenshot"
        >
          <img src={screenshotSrc} alt="Screenshot" loading="lazy" className="df-block df-w-full df-object-cover" />
        </div>
      )}

      {/* Reactions */}
      <ReactionBar
        reactions={comment.reactions ?? {}}
        currentUser={currentUser}
        onToggle={(emoji) => onReactToComment(comment.id, emoji)}
      />

      {/* Sync badge */}
      <div className="df-mt-2">
        <SyncBadge status={comment.syncStatus} error={comment.errorMessage} />
      </div>

      {/* Reply thread */}
      {(comment.replies?.length ?? 0) > 0 && (
        <div className="df-mt-3 df-border-l-2 df-border-gray-100 df-pl-3 df-flex df-flex-col df-gap-2.5">
          {comment.replies!.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              currentUser={currentUser}
              onReact={(emoji) => onReactToReply(comment.id, reply.id, emoji)}
            />
          ))}
        </div>
      )}

      {/* Reply action */}
      {showReplyForm ? (
        <div className="df-mt-3 df-flex df-flex-col df-gap-2" onKeyDown={handleKeyDown}>
          {!replyName && (
            <input
              className="df-h-7 df-w-full df-rounded-md df-border df-border-gray-200 df-px-2 df-text-xs df-text-gray-900 df-outline-none focus:df-border-indigo-500"
              placeholder="Your name"
              value={replyName}
              onChange={(e) => setReplyName(e.target.value)}
            />
          )}
          <textarea
            ref={textareaRef}
            className="df-w-full df-resize-none df-rounded-md df-border df-border-gray-200 df-px-2 df-py-1.5 df-text-xs df-text-gray-900 df-outline-none focus:df-border-indigo-500"
            placeholder="Write a reply…"
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div className="df-flex df-items-center df-justify-end df-gap-2">
            <span className="df-flex-1 df-text-[10px] df-text-gray-400">
              <kbd className="df-rounded df-bg-gray-100 df-px-1 df-font-sans">⌘</kbd>↵
            </span>
            <button
              className="df-text-xs df-text-gray-400 hover:df-text-gray-600"
              onClick={() => { setShowReplyForm(false); setReplyText('') }}
            >
              Cancel
            </button>
            <button
              className="df-rounded df-bg-indigo-600 df-px-2.5 df-py-1 df-text-xs df-font-medium df-text-white hover:df-bg-indigo-700 disabled:df-opacity-40"
              disabled={!replyText.trim() || !replyName.trim()}
              onClick={handleSubmitReply}
            >
              Reply
            </button>
          </div>
        </div>
      ) : (
        <button
          className="df-mt-2 df-text-xs df-text-gray-400 df-transition-colors hover:df-text-indigo-600"
          onClick={() => setShowReplyForm(true)}
        >
          Reply
        </button>
      )}
    </div>
  )
}

// ── ReactionBar ──────────────────────────────────────────────

interface ReactionBarProps {
  reactions: Record<string, string[]>
  currentUser: string
  onToggle: (emoji: string) => void
}

function ReactionBar({ reactions, currentUser, onToggle }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="df-mt-2 df-flex df-flex-wrap df-items-center df-gap-1">
      {Object.entries(reactions).map(([emoji, authors]) => {
        const reacted = authors.includes(currentUser)
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            title={authors.join(', ')}
            className={cn(
              'df-inline-flex df-items-center df-gap-1 df-rounded-full df-border df-px-2 df-py-0.5 df-text-xs df-transition-colors',
              reacted
                ? 'df-border-indigo-300 df-bg-indigo-50 df-text-indigo-700'
                : 'df-border-gray-200 df-bg-white df-text-gray-600 hover:df-border-gray-300 hover:df-bg-gray-50',
            )}
          >
            <span>{emoji}</span>
            <span className="df-font-medium">{authors.length}</span>
          </button>
        )
      })}

      <button
        ref={triggerRef}
        onClick={() => setPickerOpen((v) => !v)}
        title="Add reaction"
        className="df-inline-flex df-items-center df-justify-center df-rounded-full df-border df-border-dashed df-border-gray-200 df-px-2 df-py-0.5 df-text-xs df-text-gray-400 df-transition-colors hover:df-border-gray-300 hover:df-text-gray-600"
      >
        😊
      </button>

      {pickerOpen && (
        <EmojiPickerPortal
          anchorRef={triggerRef}
          onSelect={onToggle}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

// ── ReplyItem ────────────────────────────────────────────────

interface ReplyItemProps {
  reply: Reply
  currentUser: string
  onReact: (emoji: string) => void
}

function ReplyItem({ reply, currentUser, onReact }: ReplyItemProps) {
  return (
    <div>
      <div className="df-flex df-items-baseline df-justify-between df-gap-2 df-mb-0.5">
        <span className="df-text-xs df-font-semibold df-text-gray-800">{reply.authorName}</span>
        <span className="df-shrink-0 df-text-[10px] df-text-gray-400" title={formatAbsolute(reply.timestamp)}>
          {formatRelative(reply.timestamp)}
        </span>
      </div>
      <p className="df-text-xs df-leading-relaxed df-text-gray-600">{reply.text}</p>
      <ReactionBar
        reactions={reply.reactions ?? {}}
        currentUser={currentUser}
        onToggle={onReact}
      />
    </div>
  )
}

// ── SyncBadge ────────────────────────────────────────────────

function SyncBadge({ status, error }: { status: Comment['syncStatus']; error?: string }) {
  const base = 'df-inline-flex df-items-center df-rounded-full df-px-2 df-py-0.5 df-text-xs df-font-medium'
  if (status === 'local')   return <span className={cn(base, 'df-bg-gray-100 df-text-gray-500')}>Local</span>
  if (status === 'syncing') return <span className={cn(base, 'df-bg-blue-50 df-text-blue-600')}>Syncing…</span>
  if (status === 'synced')  return <span className={cn(base, 'df-bg-emerald-50 df-text-emerald-700')}>✓ Notion</span>
  return <span className={cn(base, 'df-bg-red-50 df-text-red-600 df-cursor-help')} title={error}>Sync failed</span>
}

// ── Helpers ──────────────────────────────────────────────────

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
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
