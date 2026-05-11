export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

export interface Reply {
  id: string
  authorName: string
  text: string
  timestamp: string
  reactions?: Record<string, string[]>
}

export interface Comment {
  id: string
  x: number
  y: number
  text: string
  authorName: string
  tags: string[]
  timestamp: string
  pageUrl: string
  screenshotDataUrl?: string
  screenshotPublicUrl?: string
  syncStatus: SyncStatus
  notionPageId?: string
  errorMessage?: string
  replies?: Reply[]
  reactions?: Record<string, string[]>
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
