import { useEffect } from 'react'

interface CommentOverlayProps {
  onClickAt: (x: number, y: number) => void
  onCancel: () => void
}

export function CommentOverlay({ onClickAt, onCancel }: CommentOverlayProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      id="df-overlay"
      className="df-overlay"
      onClick={(e) => {
        e.stopPropagation()
        onClickAt(e.clientX, e.clientY)
      }}
    >
      <div className="df-overlay__hint" onClick={(e) => e.stopPropagation()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="22" y1="12" x2="18" y2="12" />
          <line x1="6" y1="12" x2="2" y2="12" />
          <line x1="12" y1="6" x2="12" y2="2" />
          <line x1="12" y1="22" x2="12" y2="18" />
        </svg>
        Click anywhere to place a comment
        <kbd>Esc</kbd> to cancel
      </div>
    </div>
  )
}
