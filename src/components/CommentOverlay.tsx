import { useEffect } from 'react'

interface CommentOverlayProps {
  onClickAt: (x: number, y: number) => void
  onCancel: () => void
}

export function CommentOverlay({ onClickAt, onCancel }: CommentOverlayProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      className="df-overlay"
      onClick={(e) => { e.stopPropagation(); onClickAt(e.clientX, e.clientY) }}
    >
      <div
        className="df-pointer-events-none df-absolute df-left-1/2 df-top-4 -df-translate-x-1/2 df-flex df-items-center df-gap-2 df-rounded-lg df-bg-gray-900 df-bg-opacity-90 df-px-4 df-py-2 df-text-sm df-text-gray-100 df-whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
        </svg>
        Click anywhere to place a comment
        <kbd className="df-rounded df-bg-white df-bg-opacity-20 df-px-1.5 df-py-0.5 df-font-sans df-text-xs">Esc</kbd>
      </div>
    </div>
  )
}
