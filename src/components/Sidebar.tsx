import type { Comment } from '../types'
import { cn } from '../lib/utils'
import { CommentCard } from './CommentCard'

interface SidebarProps {
  comments: Comment[]
  isOpen: boolean
  onToggle: () => void
  onOpenSettings: () => void
  showSettings: boolean
  settingsContent: React.ReactNode
  onReply: (commentId: string, authorName: string, text: string) => void
}

export function Sidebar({ comments, isOpen, onToggle, onOpenSettings, showSettings, settingsContent, onReply }: SidebarProps) {
  return (
    <>
      {/* Pull tab */}
      <button
        className={cn(
          'df-pull-tab df-pointer-events-auto df-fixed df-top-1/2 -df-translate-y-1/2 df-z-tab',
          'df-flex df-flex-col df-items-center df-gap-1 df-rounded-l-lg df-bg-gray-900 df-px-2 df-py-3 df-text-white df-shadow-lg',
          'hover:df-bg-gray-700 df-transition-colors',
          isOpen ? 'df-right-[340px]' : 'df-right-0',
        )}
        onClick={onToggle}
        title={isOpen ? 'Close feedback panel' : 'Open feedback panel'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {isOpen ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
        </svg>
        {!isOpen && comments.length > 0 && (
          <span className="df-flex df-h-5 df-min-w-5 df-items-center df-justify-center df-rounded-full df-bg-indigo-600 df-px-1 df-text-[10px] df-font-semibold">
            {comments.length}
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        className={cn(
          'df-sidebar df-pointer-events-auto df-fixed df-right-0 df-top-0 df-z-sidebar df-flex df-h-full df-w-[340px] df-flex-col df-bg-white df-shadow-2xl',
          isOpen ? 'df-translate-x-0' : 'df-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="df-flex df-shrink-0 df-items-center df-justify-between df-border-b df-border-gray-100 df-px-4 df-py-3">
          <h2 className="df-text-sm df-font-semibold df-text-gray-900">Feedback</h2>
          <div className="df-flex df-items-center df-gap-3">
            <span className="df-text-xs df-text-gray-400">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
            <button
              className={cn(
                'df-rounded-md df-p-1.5 df-transition-colors hover:df-bg-gray-100',
                showSettings ? 'df-text-indigo-600' : 'df-text-gray-400',
              )}
              onClick={onOpenSettings}
              title="Settings"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="df-sidebar-body df-flex-1 df-overflow-y-auto">
          {showSettings ? (
            settingsContent
          ) : comments.length === 0 ? (
            <div className="df-flex df-flex-col df-items-center df-justify-center df-gap-1 df-p-8 df-text-center">
              <p className="df-text-sm df-text-gray-500">No comments yet.</p>
              <p className="df-text-xs df-text-gray-400">Click the button to add feedback.</p>
            </div>
          ) : (
            comments.map((comment) => <CommentCard key={comment.id} comment={comment} onReply={onReply} />)
          )}
        </div>
      </div>
    </>
  )
}
