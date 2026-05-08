import { useEffect, useRef } from 'react'
import type { Comment, SyncStatus } from '../src/types'
import { loadConfig, saveConfig } from '../src/storage'

interface UseNotionSyncParams {
  projectName: string
  apiUrl: string
  comments: Comment[]
  updateSyncStatus: (id: string, status: SyncStatus, extra?: Partial<Comment>) => void
}

const SYNC_DELAY_MS = 350

export function useNotionSync({ projectName, apiUrl, comments, updateSyncStatus }: UseNotionSyncParams) {
  const inFlight = useRef<Set<string>>(new Set())
  const isSyncing = useRef(false)

  useEffect(() => {
    const unsynced = comments.filter(
      (c) => c.syncStatus === 'local' && !inFlight.current.has(c.id),
    )
    if (unsynced.length === 0 || isSyncing.current) return

    void syncQueue(unsynced)
  }, [comments])  // eslint-disable-line react-hooks/exhaustive-deps

  async function getOrProvisionDatabase(): Promise<string | null> {
    const cached = loadConfig(projectName).notionDatabaseId
    if (cached) return cached

    try {
      const res = await fetch(`${apiUrl}/api/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName }),
      })
      if (!res.ok) throw new Error(`Provision failed: ${res.status}`)
      const data = (await res.json()) as { databaseId: string }
      saveConfig(projectName, { notionDatabaseId: data.databaseId })
      return data.databaseId
    } catch (err) {
      console.warn('[FeedbackWidget] Notion provisioning failed:', err)
      return null
    }
  }

  async function uploadScreenshot(dataUrl: string): Promise<string | null> {
    try {
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = (await res.json()) as { url: string }
      return data.url
    } catch {
      return null
    }
  }

  async function syncOne(comment: Comment, notionDatabaseId: string): Promise<void> {
    updateSyncStatus(comment.id, 'syncing')

    let screenshotPublicUrl: string | undefined
    if (comment.screenshotDataUrl) {
      screenshotPublicUrl = (await uploadScreenshot(comment.screenshotDataUrl)) ?? undefined
    }

    try {
      const res = await fetch(`${apiUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          text: comment.text,
          authorName: comment.authorName,
          tags: comment.tags ?? [],
          x: comment.x,
          y: comment.y,
          pageUrl: comment.pageUrl,
          timestamp: comment.timestamp,
          screenshotPublicUrl,
          projectName,
          notionDatabaseId,
        }),
      })

      if (!res.ok) {
        const retryAfter = res.headers.get('Retry-After')
        if (res.status === 429 && retryAfter) {
          await delay(Number(retryAfter) * 1000)
          return syncOne(comment, notionDatabaseId)
        }
        throw new Error(`Sync failed: ${res.status}`)
      }

      const data = (await res.json()) as { notionPageId: string }
      updateSyncStatus(comment.id, 'synced', {
        notionPageId: data.notionPageId,
        screenshotPublicUrl,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      updateSyncStatus(comment.id, 'error', { errorMessage })
    } finally {
      inFlight.current.delete(comment.id)
    }
  }

  async function syncQueue(unsynced: Comment[]) {
    isSyncing.current = true

    const notionDatabaseId = await getOrProvisionDatabase()
    if (!notionDatabaseId) {
      isSyncing.current = false
      return
    }

    for (const comment of unsynced) {
      inFlight.current.add(comment.id)
      await syncOne(comment, notionDatabaseId)
      if (unsynced.indexOf(comment) < unsynced.length - 1) {
        await delay(SYNC_DELAY_MS)
      }
    }

    isSyncing.current = false
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
