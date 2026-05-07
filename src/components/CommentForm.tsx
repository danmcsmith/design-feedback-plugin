import { useState, useEffect, useRef } from 'react'
import { loadAuthorName, saveAuthorName } from '../storage'

const FORM_WIDTH = 320
const FORM_HEIGHT_ESTIMATE = 220
const MARGIN = 12

interface CommentFormProps {
  pinX: number
  pinY: number
  onSubmit: (text: string, authorName: string) => void
  onCancel: () => void
}

export function CommentForm({ pinX, pinY, onSubmit, onCancel }: CommentFormProps) {
  const [text, setText] = useState('')
  const [name, setName] = useState(loadAuthorName())
  const [editingName, setEditingName] = useState(!loadAuthorName())

  const nameRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = pinX + 16
  let top = pinY - FORM_HEIGHT_ESTIMATE / 2

  if (left + FORM_WIDTH + MARGIN > vw) {
    left = pinX - FORM_WIDTH - 16
  }
  top = Math.max(MARGIN, Math.min(top, vh - FORM_HEIGHT_ESTIMATE - MARGIN))
  left = Math.max(MARGIN, Math.min(left, vw - FORM_WIDTH - MARGIN))

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
    else textareaRef.current?.focus()
  }, [editingName])

  function handleSubmit() {
    if (!text.trim() || !name.trim()) return
    saveAuthorName(name.trim())
    onSubmit(text.trim(), name.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCancel()
    }
  }

  return (
    <div
      className="df-form"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {editingName ? (
        <div className="df-form__name-row">
          <input
            ref={nameRef}
            className="df-form__input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                e.preventDefault()
                setEditingName(false)
              }
            }}
          />
          <button
            className="df-form__name-confirm"
            disabled={!name.trim()}
            onClick={() => setEditingName(false)}
          >
            Next
          </button>
        </div>
      ) : (
        <div className="df-form__author">
          <span className="df-form__author-name">{name}</span>
          <button className="df-form__author-change" onClick={() => setEditingName(true)}>
            Change
          </button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="df-form__textarea"
        placeholder="Describe the issue or feedback…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />

      <div className="df-form__footer">
        <span className="df-form__hint">
          <kbd>⌘</kbd>↵ to post
        </span>
        <button className="df-form__btn df-form__btn--cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="df-form__btn df-form__btn--submit"
          onClick={handleSubmit}
          disabled={!text.trim() || !name.trim()}
        >
          Post
        </button>
      </div>
    </div>
  )
}
