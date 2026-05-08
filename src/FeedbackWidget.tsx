import { useState } from 'react'
import { createPortal } from 'react-dom'
import './widget.css'
import type { PendingPin } from './types'
import { useComments } from '../hooks/useComments'
import { useScreenshot } from '../hooks/useScreenshot'
import { useNotionSync } from '../hooks/useNotionSync'
import { FloatingButton } from './components/FloatingButton'
import { CommentOverlay } from './components/CommentOverlay'
import { CommentForm } from './components/CommentForm'
import { Sidebar } from './components/Sidebar'
import { SettingsPanel } from './components/SettingsPanel'

export interface FeedbackWidgetProps {
  projectName: string
  apiUrl: string
}

export function FeedbackWidget({ projectName, apiUrl }: FeedbackWidgetProps) {
  const [portalRoot] = useState(() => {
    let el = document.getElementById('df-root')
    if (!el) {
      el = document.createElement('div')
      el.id = 'df-root'
      document.body.appendChild(el)
    }
    return el
  })

  const [isCommentMode, setIsCommentMode] = useState(false)
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { comments, addComment, updateSyncStatus, addReply } = useComments(projectName)
  const { capture } = useScreenshot()

  useNotionSync({ projectName, apiUrl, comments, updateSyncStatus })

  function handleFabClick() {
    if (isCommentMode) {
      setIsCommentMode(false)
      setPendingPin(null)
    } else {
      setIsCommentMode(true)
    }
  }

  async function handleOverlayClick(x: number, y: number) {
    setIsCommentMode(false)

    const xPct = (x / window.innerWidth) * 100
    const yPct = (y / window.innerHeight) * 100

    const screenshotDataUrl = await capture(x, y)

    setPendingPin({ x, y, xPct, yPct, screenshotDataUrl })
  }

  function handleFormSubmit(text: string, authorName: string, tags: string[]) {
    if (!pendingPin) return

    addComment({
      x: pendingPin.xPct,
      y: pendingPin.yPct,
      text,
      authorName,
      tags,
      screenshotDataUrl: pendingPin.screenshotDataUrl,
    })

    setPendingPin(null)
    setIsSidebarOpen(true)
  }

  function handleFormCancel() {
    setPendingPin(null)
  }

  function handleOverlayCancel() {
    setIsCommentMode(false)
    setPendingPin(null)
  }

  return createPortal(
    <>
      {isCommentMode && (
        <CommentOverlay onClickAt={handleOverlayClick} onCancel={handleOverlayCancel} />
      )}

      {pendingPin && (
        <>
          <div
            className="df-pointer-events-none df-fixed df-z-form -df-translate-x-1/2 -df-translate-y-1/2"
            style={{ left: pendingPin.x, top: pendingPin.y }}
          >
            <div className="df-h-3 df-w-3 df-rounded-full df-border-2 df-border-white df-bg-indigo-600 df-shadow-[0_0_0_2px_#4f46e5,0_2px_8px_rgba(79,70,229,0.5)]" />
          </div>
          <CommentForm
            pinX={pendingPin.x}
            pinY={pendingPin.y}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </>
      )}

      <Sidebar
        comments={comments}
        isOpen={isSidebarOpen}
        onToggle={() => {
          setIsSidebarOpen((v) => !v)
          setShowSettings(false)
        }}
        onOpenSettings={() => setShowSettings((v) => !v)}
        showSettings={showSettings}
        settingsContent={<SettingsPanel projectName={projectName} apiUrl={apiUrl} />}
        onReply={addReply}
      />

      <FloatingButton
        isActive={isCommentMode}
        onClick={handleFabClick}
      />
    </>,
    portalRoot,
  )
}
