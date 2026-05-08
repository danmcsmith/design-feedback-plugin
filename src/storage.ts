import type { Comment, ProjectConfig } from './types'

const AUTHOR_KEY = 'df_author_name'
const FAB_POS_KEY = 'df_fab_pos'
const CUSTOM_TAGS_KEY = 'df_custom_tags'

export const DEFAULT_TAGS = ['Design', 'Eng']

export function loadCustomTags(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function saveCustomTag(tag: string): void {
  try {
    const existing = loadCustomTags()
    if (!existing.includes(tag)) {
      localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify([...existing, tag]))
    }
  } catch {}
}

export function loadAllTags(): string[] {
  return [...DEFAULT_TAGS, ...loadCustomTags()]
}

export function loadAuthorName(): string {
  return localStorage.getItem(AUTHOR_KEY) ?? ''
}

export function saveAuthorName(name: string): void {
  try {
    localStorage.setItem(AUTHOR_KEY, name)
  } catch {}
}

export function loadFabPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY)
    return raw ? (JSON.parse(raw) as { x: number; y: number }) : null
  } catch {
    return null
  }
}

export function saveFabPos(pos: { x: number; y: number }): void {
  try {
    localStorage.setItem(FAB_POS_KEY, JSON.stringify(pos))
  } catch {}
}

function commentsKey(projectName: string) {
  return `df_comments_${projectName}`
}

export function loadComments(projectName: string): Comment[] {
  try {
    const raw = localStorage.getItem(commentsKey(projectName))
    return raw ? (JSON.parse(raw) as Comment[]) : []
  } catch {
    return []
  }
}

export function saveComments(projectName: string, comments: Comment[]): void {
  try {
    localStorage.setItem(commentsKey(projectName), JSON.stringify(comments))
  } catch {}
}

function configKey(projectName: string) {
  return `df_config_${projectName}`
}

export function loadConfig(projectName: string): Partial<ProjectConfig> {
  try {
    const raw = localStorage.getItem(configKey(projectName))
    return raw ? (JSON.parse(raw) as Partial<ProjectConfig>) : {}
  } catch {
    return {}
  }
}

export function saveConfig(projectName: string, config: Partial<ProjectConfig>): void {
  try {
    const existing = loadConfig(projectName)
    localStorage.setItem(configKey(projectName), JSON.stringify({ ...existing, ...config }))
  } catch {}
}

export function clearConfig(projectName: string): void {
  try {
    localStorage.removeItem(configKey(projectName))
  } catch {}
}
