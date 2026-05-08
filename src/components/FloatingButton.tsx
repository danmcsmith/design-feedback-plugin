import { useState, useEffect, useRef } from 'react'
import { loadFabPos, saveFabPos } from '../storage'
import { cn } from '../lib/utils'

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
    dragOffset.current = { dx: e.clientX - posRef.current.x, dy: e.clientY - posRef.current.y }
    e.preventDefault()
  }

  function handleClick() {
    if (hasMoved.current) return
    onClick()
  }

  return (
    <button
      className={cn(
        'df-pointer-events-auto df-fixed df-flex df-h-12 df-w-12 df-items-center df-justify-center df-rounded-full df-border-0 df-shadow-lg df-select-none df-transition-all df-duration-150',
        'df-z-fab',
        isActive
          ? 'df-bg-indigo-600 df-text-white hover:df-bg-indigo-700'
          : 'df-bg-gray-900 df-text-white hover:df-bg-gray-700',
        isDragging && 'df-scale-105 df-cursor-grabbing df-shadow-xl',
      )}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={isActive ? 'Cancel comment mode' : 'Add a comment'}
    >
      {isActive ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      )}
    </button>
  )
}
