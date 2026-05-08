import { useState, useEffect, useRef } from 'react'
import { loadAuthorName, saveAuthorName, loadAllTags, saveCustomTag } from '../storage'
import { cn } from '../lib/utils'
import { getTagColor } from '../lib/tagColors'

const FORM_WIDTH = 320
const FORM_HEIGHT_ESTIMATE = 280
const MARGIN = 12

interface CommentFormProps {
  pinX: number
  pinY: number
  onSubmit: (text: string, authorName: string, tags: string[]) => void
  onCancel: () => void
}

export function CommentForm({ pinX, pinY, onSubmit, onCancel }: CommentFormProps) {
  const [text, setText] = useState('')
  const [name, setName] = useState(loadAuthorName())
  const [editingName, setEditingName] = useState(!loadAuthorName())
  const [tags, setTags] = useState<string[]>(loadAllTags())
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [addingTag, setAddingTag] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')

  const nameRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const newTagRef = useRef<HTMLInputElement>(null)

  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = pinX + 16
  let top = pinY - FORM_HEIGHT_ESTIMATE / 2
  if (left + FORM_WIDTH + MARGIN > vw) left = pinX - FORM_WIDTH - 16
  top = Math.max(MARGIN, Math.min(top, vh - FORM_HEIGHT_ESTIMATE - MARGIN))
  left = Math.max(MARGIN, Math.min(left, vw - FORM_WIDTH - MARGIN))

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
    else textareaRef.current?.focus()
  }, [editingName])

  useEffect(() => {
    if (addingTag) newTagRef.current?.focus()
  }, [addingTag])

  function toggleTag(tag: string) {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  function commitNewTag() {
    const trimmed = newTagValue.trim()
    if (trimmed) {
      saveCustomTag(trimmed)
      setTags(loadAllTags())
      setSelectedTags((prev) => [...prev, trimmed])
    }
    setNewTagValue('')
    setAddingTag(false)
  }

  function handleSubmit() {
    if (!text.trim() || !name.trim()) return
    saveAuthorName(name.trim())
    onSubmit(text.trim(), name.trim(), selectedTags)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit() }
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
  }

  return (
    <div
      className="df-pointer-events-auto df-fixed df-z-form df-flex df-w-80 df-flex-col df-gap-3 df-rounded-xl df-border df-border-gray-200 df-bg-white df-p-4 df-shadow-xl"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {/* Author */}
      {editingName ? (
        <div className="df-flex df-gap-2">
          <input
            ref={nameRef}
            className="df-h-8 df-flex-1 df-rounded-md df-border df-border-gray-300 df-px-3 df-text-sm df-text-gray-900 df-outline-none focus:df-border-indigo-500 focus:df-ring-2 focus:df-ring-indigo-500"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { e.preventDefault(); setEditingName(false) } }}
          />
          <button
            className="df-h-8 df-rounded-md df-bg-indigo-600 df-px-3 df-text-sm df-font-medium df-text-white hover:df-bg-indigo-700 disabled:df-opacity-50"
            disabled={!name.trim()}
            onClick={() => setEditingName(false)}
          >
            Next
          </button>
        </div>
      ) : (
        <div className="df-flex df-items-center df-gap-2">
          <span className="df-text-sm df-font-medium df-text-gray-800">{name}</span>
          <button className="df-text-xs df-text-gray-400 df-underline hover:df-text-indigo-600" onClick={() => setEditingName(true)}>
            Change
          </button>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className="df-min-h-[72px] df-w-full df-resize-y df-rounded-md df-border df-border-gray-300 df-px-3 df-py-2 df-text-sm df-text-gray-900 df-outline-none focus:df-border-indigo-500 focus:df-ring-2 focus:df-ring-indigo-500"
        placeholder="Describe the issue or feedback…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />

      {/* Tags */}
      <div className="df-flex df-flex-wrap df-gap-1.5">
        {tags.map((tag, i) => {
          const color = getTagColor(i)
          const selected = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                'df-inline-flex df-items-center df-gap-1.5 df-rounded df-px-2 df-py-1 df-text-xs df-font-medium df-transition-all df-border',
                selected
                  ? cn(color.bg, color.text, 'df-border-transparent')
                  : 'df-bg-white df-text-gray-500 df-border-gray-200 hover:df-border-gray-400',
              )}
            >
              <span className={cn('df-h-1.5 df-w-1.5 df-rounded-full df-flex-shrink-0', selected ? color.dot : 'df-bg-gray-300')} />
              {tag}
            </button>
          )
        })}

        {addingTag ? (
          <input
            ref={newTagRef}
            className="df-h-7 df-w-24 df-rounded df-border df-border-dashed df-border-indigo-400 df-bg-indigo-50 df-px-2 df-text-xs df-text-indigo-700 df-outline-none"
            placeholder="Tag name…"
            value={newTagValue}
            onChange={(e) => setNewTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitNewTag() }
              if (e.key === 'Escape') { setAddingTag(false); setNewTagValue('') }
            }}
            onBlur={commitNewTag}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingTag(true)}
            className="df-inline-flex df-items-center df-gap-1 df-rounded df-border df-border-dashed df-border-gray-300 df-px-2 df-py-1 df-text-xs df-text-gray-400 hover:df-border-indigo-400 hover:df-text-indigo-600"
          >
            + Tag
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="df-flex df-items-center df-gap-2">
        <span className="df-flex-1 df-text-xs df-text-gray-400">
          <kbd className="df-rounded df-bg-gray-100 df-px-1 df-font-sans">⌘</kbd>↵ to post
        </span>
        <button className="df-h-8 df-rounded-md df-bg-gray-100 df-px-3 df-text-sm df-font-medium df-text-gray-600 hover:df-bg-gray-200" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="df-h-8 df-rounded-md df-bg-indigo-600 df-px-3 df-text-sm df-font-medium df-text-white hover:df-bg-indigo-700 disabled:df-opacity-40"
          onClick={handleSubmit}
          disabled={!text.trim() || !name.trim()}
        >
          Post
        </button>
      </div>
    </div>
  )
}
