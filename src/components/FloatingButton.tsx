import { useState, useEffect, useRef } from 'react'
import { loadFabPos, saveFabPos } from '../storage'

const FAB_SIZE = 48
const MARGIN = 16

function defaultPos() {
  return { x: window.innerWidth - FAB_SIZE - MARGIN, y: MARGIN + 24 }
}

interface FloatingButtonProps {
  isActive: boolean
  onClick: () => void
}

export function FloatingButton({ isActive, onClick }: FloatingButtonProps) {
  const [pos, setPos] = useState(() => loadFabPos() ?? defaultPos())
  const [isDragging, setIsDragging] = useState(false)

  const posRef = useRef(pos)
  const dragging = useRef(false)
  const hasMoved = useRef(false)
  const dragOffset = useRef({ dx: 0, dy: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      hasMoved.current = true

      const x = Math.max(MARGIN, Math.min(window.innerWidth - FAB_SIZE - MARGIN, e.clientX - dragOffset.current.dx))
      const y = Math.max(MARGIN, Math.min(window.innerHeight - FAB_SIZE - MARGIN, e.clientY - dragOffset.current.dy))

      const next = { x, y }
      posRef.current = next
      setPos(next)
    }

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      setIsDragging(false)
      saveFabPos(posRef.current)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function handleMouseDown(e: React.MouseEvent) {
    dragging.current = true
    hasMoved.current = false
    setIsDragging(true)
    dragOffset.current = {
      dx: e.clientX - posRef.current.x,
      dy: e.clientY - posRef.current.y,
    }
    e.preventDefault()
  }

  function handleClick() {
    if (hasMoved.current) return
    onClick()
  }

  return (
    <button
      className={`df-fab${isActive ? ' df-fab--active' : ''}${isDragging ? ' df-fab--dragging' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={isActive ? 'Cancel comment mode' : 'Add a comment'}
    >
      {isActive ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )}
    </button>
  )
}
