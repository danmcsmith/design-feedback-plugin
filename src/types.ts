export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

export interface Comment {
  id: string
  x: number
  y: number
  text: string
  authorName: string
  timestamp: string
  pageUrl: string
  screenshotDataUrl?: string
  screenshotPublicUrl?: string
  syncStatus: SyncStatus
  notionPageId?: string
  errorMessage?: string
}

export interface PendingPin {
  x: number
  y: number
  xPct: number
  yPct: number
  screenshotDataUrl?: string
}

export interface ProjectConfig {
  notionDatabaseId: string
}
