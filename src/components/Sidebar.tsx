import type { Comment } from '../types'
import { CommentCard } from './CommentCard'

interface SidebarProps {
  comments: Comment[]
  isOpen: boolean
  onToggle: () => void
  onOpenSettings: () => void
  showSettings: boolean
  settingsContent: React.ReactNode
}

export function Sidebar({ comments, isOpen, onToggle, onOpenSettings, showSettings, settingsContent }: SidebarProps) {
  return (
    <>
      <button
        className={`df-sidebar__pull-tab${isOpen ? ' df-sidebar__pull-tab--open' : ''}`}
        onClick={onToggle}
        title={isOpen ? 'Close feedback panel' : 'Open feedback panel'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {isOpen ? (
            <polyline points="9 18 15 12 9 6" />
          ) : (
            <polyline points="15 18 9 12 15 6" />
          )}
        </svg>
        {!isOpen && comments.length > 0 && (
          <span className="df-sidebar__pull-tab-count">{comments.length}</span>
        )}
      </button>

      <div className={`df-sidebar${isOpen ? ' df-sidebar--open' : ''}`}>
        <div className="df-sidebar__header">
          <h2 className="df-sidebar__title">Feedback</h2>
          <div className="df-sidebar__header-actions">
            <span className="df-sidebar__count">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
            <button
              className={`df-sidebar__settings-btn${showSettings ? ' df-sidebar__settings-btn--active' : ''}`}
              onClick={onOpenSettings}
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="df-sidebar__body">
          {showSettings ? (
            settingsContent
          ) : comments.length === 0 ? (
            <div className="df-sidebar__empty">
              <p>No comments yet.</p>
              <p>Click the button to add feedback.</p>
            </div>
          ) : (
            <div className="df-sidebar__comments">
              {comments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
