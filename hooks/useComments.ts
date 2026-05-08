import { useState, useCallback } from 'react'
import type { Comment, Reply, SyncStatus } from '../src/types'
import { loadComments, saveComments } from '../src/storage'

export function useComments(projectName: string) {
  const [comments, setComments] = useState<Comment[]>(() => loadComments(projectName))

  const addComment = useCallback(
    (draft: Omit<Comment, 'id' | 'timestamp' | 'syncStatus' | 'pageUrl'>) => {
      const comment: Comment = {
        ...draft,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        syncStatus: 'local',
      }
      setComments((prev) => {
        const next = [comment, ...prev]
        saveComments(projectName, next)
        return next
      })
      return comment
    },
    [projectName],
  )

  const updateComment = useCallback(
    (id: string, patch: Partial<Comment>) => {
      setComments((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
        saveComments(projectName, next)
        return next
      })
    },
    [projectName],
  )

  const updateSyncStatus = useCallback(
    (id: string, syncStatus: SyncStatus, extra?: Partial<Comment>) => {
      updateComment(id, { syncStatus, ...extra })
    },
    [updateComment],
  )

  const addReply = useCallback(
    (commentId: string, authorName: string, text: string) => {
      const reply: Reply = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        authorName,
        text,
        timestamp: new Date().toISOString(),
      }
      setComments((prev) => {
        const next = prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: [...(c.replies ?? []), reply] }
            : c,
        )
        saveComments(projectName, next)
        return next
      })
    },
    [projectName],
  )

  return { comments, addComment, updateComment, updateSyncStatus, addReply }
}
