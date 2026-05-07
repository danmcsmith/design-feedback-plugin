# Design Feedback Widget — Deep Dive Architecture & Setup Guide

A complete technical reference covering every design decision, every code path, how data flows from browser click to Notion row, and exact step-by-step instructions for setting up the system from scratch.

---

## Table of Contents

1. [What This Is & Why It Exists](#1-what-this-is--why-it-exists)
2. [System Architecture](#2-system-architecture)
3. [Project File Structure](#3-project-file-structure)
4. [The Widget — Full Technical Breakdown](#4-the-widget--full-technical-breakdown)
   - [4.1 Stack & Build Configuration](#41-stack--build-configuration)
   - [4.2 Entry Point & Portal Mounting](#42-entry-point--portal-mounting)
   - [4.3 Type System](#43-type-system)
   - [4.4 localStorage Layer](#44-localstorage-layer)
   - [4.5 Comment State Hook](#45-comment-state-hook)
   - [4.6 Screenshot Capture Hook](#46-screenshot-capture-hook)
   - [4.7 Notion Sync Hook](#47-notion-sync-hook)
   - [4.8 FloatingButton — Drag Implementation](#48-floatingbutton--drag-implementation)
   - [4.9 CommentOverlay](#49-commentoverlay)
   - [4.10 CommentForm — Positioning & Author Persistence](#410-commentform--positioning--author-persistence)
   - [4.11 Sidebar & Pull Tab](#411-sidebar--pull-tab)
   - [4.12 CommentCard — Sync Status Display](#412-commentcard--sync-status-display)
   - [4.13 Style Isolation Strategy](#413-style-isolation-strategy)
5. [The Server — Full Technical Breakdown](#5-the-server--full-technical-breakdown)
   - [5.1 Why a Server Exists](#51-why-a-server-exists)
   - [5.2 Express App Setup](#52-express-app-setup)
   - [5.3 Postgres — Screenshot Storage](#53-postgres--screenshot-storage)
   - [5.4 Screenshot Routes](#54-screenshot-routes)
   - [5.5 Notion Client Setup](#55-notion-client-setup)
   - [5.6 Notion Database Provisioning](#56-notion-database-provisioning)
   - [5.7 Notion Comment Sync](#57-notion-comment-sync)
   - [5.8 Full Request → Notion Flow](#58-full-request--notion-flow)
6. [Data Flow — Comment Lifecycle End to End](#6-data-flow--comment-lifecycle-end-to-end)
7. [Key Design Decisions & Tradeoffs](#7-key-design-decisions--tradeoffs)
8. [Deployment Model](#8-deployment-model)
9. [Step-by-Step Setup — From Zero to Working](#9-step-by-step-setup--from-zero-to-working)
   - [9.1 Prerequisites](#91-prerequisites)
   - [9.2 Notion Integration Setup](#92-notion-integration-setup)
   - [9.3 Deploy the Feedback Server](#93-deploy-the-feedback-server)
   - [9.4 Install the Widget on a Prototype](#94-install-the-widget-on-a-prototype)
   - [9.5 Deploy the Prototype](#95-deploy-the-prototype)
   - [9.6 Verify Everything Works](#96-verify-everything-works)
10. [Running Locally](#10-running-locally)
11. [Troubleshooting](#11-troubleshooting)
12. [Extending the Widget](#12-extending-the-widget)

---

## 1. What This Is & Why It Exists

Designers build prototypes in Vite + React and share them with other designers for feedback. Before this widget, feedback lived in Slack threads, DMs, or Notion pages that had to be manually updated. Comments were disconnected from the specific screen state that prompted them.

This widget embeds directly into any prototype and gives reviewers a native annotation experience:

- Click a floating button → click anywhere on the page → type feedback → post
- A screenshot of the clicked area is captured automatically
- The comment appears immediately in a sidebar (no page reload, no external tool)
- It syncs to a dedicated Notion database in the background

The entire feedback loop — from reviewer clicking to designer seeing a Notion row with a screenshot link — is automated. The designer sets it up once per prototype in under 5 minutes. Reviewers need zero setup.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Prototype)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Host Prototype  (React 18 + Vite)          │   │
│  │                                                      │   │
│  │  function App() {                                    │   │
│  │    return (                                          │   │
│  │      <>                                              │   │
│  │        <YourPrototypeContent />                      │   │
│  │        <FeedbackWidget                               │   │
│  │          projectName="agenda-v2"        ◄── one import   │
│  │          apiUrl={import.meta.env.VITE_...} ◄── one env var│
│  │        />                                            │   │
│  │      </>                                             │   │
│  │    )                                                 │   │
│  │  }                                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│               │                                              │
│        React.createPortal()                                  │
│               │                                              │
│               ▼                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  #df-root div   ◄── appended to body               │     │
│  │  (widget lives      completely isolated             │     │
│  │   entirely here)    from prototype DOM              │     │
│  └────────────────────────────────────────────────────┘     │
│               │                                              │
│               ▼                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                     Widget UI                       │     │
│  │  FloatingButton (draggable, top-right default)      │     │
│  │  CommentOverlay (full-viewport, crosshair cursor)   │     │
│  │  CommentForm (pin-anchored card, auto-positioned)   │     │
│  │  Sidebar (340px, slides from right)                 │     │
│  │    └── CommentCard[] (name, time, text, screenshot) │     │
│  │    └── SettingsPanel (gear icon)                    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  localStorage (per browser)                                  │
│    df_comments_{projectName}  →  Comment[]                   │
│    df_config_{projectName}    →  { notionDbId }              │
│    df_author_name             →  "Jane Smith"                │
│    df_fab_pos                 →  { x, y }                    │
└─────────────────────────────────────────────────────────────┘
               │
        HTTPS (TailScale-only, best-effort)
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│           Feedback Server (Nanoservice)                      │
│           Node.js 20 / Express 4                             │
│                                                              │
│  POST /api/provision   Creates a Notion database             │
│  POST /api/upload      Stores screenshot → Postgres          │
│  GET  /api/screenshot/:id  Serves image bytes from Postgres  │
│  POST /api/sync        Creates a Notion page (one per comment│
│  GET  /health          Uptime check                          │
│                                                              │
│  Secrets (AWS Secrets Manager via Nanoservice):              │
│    NOTION_TOKEN          ← never touches the browser         │
│    NOTION_PARENT_PAGE_ID                                     │
│    SERVER_URL            ← TailScale URL of this server      │
│    DATABASE_URL          ← injected automatically            │
└─────────────────────────────────────────────────────────────┘
          │                          │
          ▼                          ▼
┌──────────────────┐    ┌──────────────────────┐
│      Notion      │    │   Postgres (Aurora)   │
│                  │    │                       │
│ Per-project DB   │    │   screenshots table   │
│ One row/comment  │    │     id UUID           │
│ Screenshot URL   │    │     data TEXT (base64)│
│ Status select    │    │     created_at        │
└──────────────────┘    └──────────────────────┘
```

---

## 3. Project File Structure

```
design-feedback/
│
├── src/                        ← Widget package source
│   │
│   ├── index.ts                ← Public API: re-exports FeedbackWidget + types
│   ├── FeedbackWidget.tsx      ← Root component. Owns all state. Mounts portal.
│   ├── types.ts                ← Comment, PendingPin, SyncStatus, ProjectConfig
│   ├── storage.ts              ← All localStorage reads/writes in one place
│   ├── widget.css              ← Complete widget stylesheet, scoped to #df-root
│   │
│   └── components/
│       ├── FloatingButton.tsx  ← Draggable FAB. Handles click vs drag discrimination.
│       ├── CommentOverlay.tsx  ← Full-viewport click interceptor. Escape to cancel.
│       ├── CommentForm.tsx     ← Card near pin. Name input + textarea. ⌘↵ to submit.
│       ├── CommentCard.tsx     ← Single comment in sidebar. Relative timestamp. Sync badge.
│       ├── Sidebar.tsx         ← Slide-in panel. Pull tab that rides the sidebar edge.
│       └── SettingsPanel.tsx   ← API URL field. Notion database reset.
│
├── hooks/
│   ├── useComments.ts          ← Comment array state + localStorage persistence
│   ├── useNotionSync.ts        ← Watches for unsynced comments, drives upload + sync
│   └── useScreenshot.ts        ← Lazy-loads html2canvas, crops, excludes widget DOM
│
├── server/                     ← Express API server
│   └── src/
│       ├── index.ts            ← Express app, CORS, all routes, startup
│       ├── db.ts               ← Postgres pool, initDb, saveScreenshot, getScreenshot
│       └── notion.ts           ← Notion client, provisionDatabase, syncComment
├── package.json
├── tsconfig.json
└── .env.example                ← Template for required environment variables
│
├── demo/                       ← Local test prototype
│   ├── index.html
│   ├── main.tsx                ← Renders a fake prototype + <FeedbackWidget />
│   └── vite.config.ts
│
├── dist/                       ← Compiled widget output (git-ignored, created by npm run build)
│   ├── index.mjs               ← ESM bundle
│   ├── index.cjs               ← CommonJS bundle
│   ├── index.css               ← Extracted styles (injected at runtime by vite-plugin-lib-inject-css)
│   └── index.d.ts              ← TypeScript declarations
│
├── package.json                ← Widget package. peerDeps: react, react-dom
├── vite.config.ts              ← Library build: ESM + CJS, externalize React
├── tsconfig.json               ← Strict mode, jsx: react-jsx (no React import needed)
├── .gitignore
├── README.md                   ← User-facing setup guide
└── ARCHITECTURE.md             ← This file
```

---

## 4. The Widget — Full Technical Breakdown

### 4.1 Stack & Build Configuration

**`package.json`** (key parts):
```json
{
  "name": "design-feedback-widget",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "peerDependencies": {
    "react": ">=17.0.0",
    "react-dom": ">=17.0.0"
  },
  "dependencies": {
    "html2canvas": "^1.4.1"
  }
}
```

`react` and `react-dom` are peer dependencies, not bundled. If they were bundled, the host prototype would have two separate React instances in memory, which breaks hooks (React uses module-level singletons internally).

**`vite.config.ts`**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css'

export default defineConfig({
  plugins: [
    react(),
    libInjectCss(),  // injects CSS as JS at runtime — consumer needs no separate CSS import
    dts({ include: ['src'], insertTypesEntry: true }),  // generates .d.ts files
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],  // don't bundle — use host's copy
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM' },
      },
    },
    sourcemap: true,
    cssCodeSplit: true,
  },
})
```

**`tsconfig.json`** (key settings):
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",      // new JSX transform — no import React needed in every file
    "strict": true,          // full strict mode
    "noUnusedLocals": true,  // catches dead code
    "noUnusedParameters": true,
    "moduleResolution": "bundler"
  }
}
```

The `react-jsx` transform means components don't need `import React from 'react'`. The compiler handles JSX transformation automatically.

---

### 4.2 Entry Point & Portal Mounting

**`src/index.ts`** — the public API surface:
```typescript
export { FeedbackWidget } from './FeedbackWidget'
export type { FeedbackWidgetProps } from './FeedbackWidget'
export type { Comment, ProjectConfig, SyncStatus } from './types'
```

**`src/FeedbackWidget.tsx`** — the root. The most important architectural decision here is the React Portal:

```typescript
export function FeedbackWidget({ projectName, apiUrl }: FeedbackWidgetProps) {

  // Create a dedicated DOM node for the widget, completely separate from the
  // host prototype's React tree. This prevents key conflicts, event bubbling
  // issues, and z-index competition with the prototype's own elements.
  const [portalRoot] = useState(() => {
    let el = document.getElementById('df-root')
    if (!el) {
      el = document.createElement('div')
      el.id = 'df-root'
      document.body.appendChild(el)
    }
    return el
  })

  // ... state, hooks ...

  return createPortal(
    <>
      {isCommentMode && <CommentOverlay ... />}
      {pendingPin && <CommentForm ... />}
      {pendingPin && <div className="df-pin" style={{ left: pendingPin.x, top: pendingPin.y }}><div className="df-pin__dot" /></div>}
      <Sidebar ... />
      <FloatingButton ... />
    </>,
    portalRoot,
  )
}
```

The portal renders into `#df-root` which is appended to `document.body`. This means:
- The widget's DOM is a sibling of the host app's root, not a child
- React events don't bubble from the widget into the prototype's React tree
- z-index stacking is independent of whatever the prototype uses

---

### 4.3 Type System

**`src/types.ts`** — every interface used across the widget:

```typescript
// The sync pipeline: local → syncing → synced (or error)
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

export interface Comment {
  id: string          // "{timestamp}-{6-char random}" — no UUID library needed
  x: number           // pin x as % of viewport width (0-100)
  y: number           // pin y as % of viewport height (0-100)
  text: string        // the reviewer's feedback text
  authorName: string  // stored separately in localStorage, attached at creation
  timestamp: string   // ISO 8601, e.g. "2026-05-07T14:32:00.000Z"
  pageUrl: string     // window.location.href at time of comment

  // Two screenshot fields — local blob is always available, public URL arrives after sync
  screenshotDataUrl?: string   // base64 JPEG from html2canvas — lives in localStorage
  screenshotPublicUrl?: string // https://{server}/api/screenshot/{uuid} — after upload

  syncStatus: SyncStatus
  notionPageId?: string  // returned by Notion API, stored for reference
  errorMessage?: string  // populated when syncStatus === 'error'
}

// Represents a pin that's been placed but not yet submitted
export interface PendingPin {
  x: number       // clientX in px — for DOM positioning
  y: number       // clientY in px — for DOM positioning
  xPct: number    // x as % of viewport — stored with comment
  yPct: number    // y as % of viewport — stored with comment
  screenshotDataUrl?: string  // captured at click time, before form shows
}
```

The two-field screenshot design (`screenshotDataUrl` + `screenshotPublicUrl`) is intentional. The local base64 blob is stored in localStorage at comment creation so the thumbnail displays immediately in the sidebar with zero network dependency. The public URL is added later when the server upload completes and is used by Notion.

---

### 4.4 localStorage Layer

**`src/storage.ts`** — all persistence in one file, never called directly from components:

```typescript
const AUTHOR_KEY = 'df_author_name'

// Author name is global — not per-project.
// The same person reviewing multiple prototypes doesn't re-enter their name.
export function loadAuthorName(): string {
  return localStorage.getItem(AUTHOR_KEY) ?? ''
}

export function saveAuthorName(name: string): void {
  try {
    localStorage.setItem(AUTHOR_KEY, name)
  } catch { /* storage full or unavailable — degrade silently */ }
}

// Comments are per-project — each prototype has its own comment list.
function commentsKey(projectName: string) {
  return `df_comments_${projectName}`
}

export function loadComments(projectName: string): Comment[] {
  try {
    const raw = localStorage.getItem(commentsKey(projectName))
    return raw ? (JSON.parse(raw) as Comment[]) : []
  } catch {
    return []  // malformed JSON — start fresh
  }
}

export function saveComments(projectName: string, comments: Comment[]): void {
  try {
    localStorage.setItem(commentsKey(projectName), JSON.stringify(comments))
  } catch { /* degrade silently */ }
}

// Config holds the cached Notion database ID so we don't re-provision every time.
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
  } catch { /* degrade silently */ }
}
```

All try/catch blocks exist because `localStorage` can throw in private browsing mode (quota exceeded or disabled). The widget treats storage as best-effort — if it fails, comments are lost on reload but the session still works.

---

### 4.5 Comment State Hook

**`src/hooks/useComments.ts`**:

```typescript
export function useComments(projectName: string) {
  // Initialize from localStorage — comments survive page refresh
  const [comments, setComments] = useState<Comment[]>(() => loadComments(projectName))

  const addComment = useCallback(
    (draft: Omit<Comment, 'id' | 'timestamp' | 'syncStatus' | 'pageUrl'>) => {
      const comment: Comment = {
        ...draft,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        syncStatus: 'local',  // always starts local — sync is async
      }
      setComments((prev) => {
        const next = [comment, ...prev]  // newest first
        saveComments(projectName, next)  // write-through to localStorage immediately
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

  return { comments, addComment, updateComment, updateSyncStatus }
}
```

`addComment` uses a functional `setComments` update (`prev => next`) to avoid stale closure issues. The localStorage write happens inside the same updater, so state and storage are always in sync.

---

### 4.6 Screenshot Capture Hook

**`src/hooks/useScreenshot.ts`**:

```typescript
const CROP_WIDTH = 600
const CROP_HEIGHT = 450

export function useScreenshot() {
  const capture = useCallback(async (clickX: number, clickY: number): Promise<string | undefined> => {
    try {
      // Dynamic import: html2canvas (~250KB gzipped) only loads when actually needed,
      // not on widget mount. This keeps the initial prototype load fast.
      const { default: html2canvas } = await import('html2canvas')

      // Calculate crop region centered on the click point
      const x = Math.max(0, clickX - CROP_WIDTH / 2)
      const y = Math.max(0, clickY - CROP_HEIGHT / 2)

      const canvas = await html2canvas(document.body, {
        x,
        y,
        width: CROP_WIDTH,
        height: CROP_HEIGHT,
        useCORS: true,     // render cross-origin images where possible
        allowTaint: true,  // don't abort on tainted canvas (some images won't render)
        logging: false,    // suppress html2canvas console noise
        ignoreElements: (el) => {
          // Exclude the entire widget from the screenshot.
          // The floating button, overlay, and any widget chrome won't appear.
          return el.id === 'df-root'
        },
      })

      // JPEG at 0.82 quality — good balance of file size vs. clarity for a thumbnail
      return canvas.toDataURL('image/jpeg', 0.82)
    } catch (err) {
      // Screenshot failure is non-fatal — comment still posts, just without a thumbnail
      console.warn('[FeedbackWidget] Screenshot capture failed:', err)
      return undefined
    }
  }, [])

  return { capture }
}
```

The screenshot is captured **at click time** — immediately when the reviewer clicks the prototype, before the comment form appears. This gives a clean capture of the prototype content. If the screenshot were taken after the form opened, the form card would appear in the screenshot.

The `ignoreElements` callback is called by html2canvas for every DOM node it encounters. Returning `true` for `#df-root` prunes the entire widget subtree from the render, so the floating button, overlay hint banner, etc. are all excluded cleanly.

---

### 4.7 Notion Sync Hook

**`src/hooks/useNotionSync.ts`** — the most complex hook. Orchestrates provisioning, upload, and sync:

```typescript
export function useNotionSync({ projectName, apiUrl, comments, updateSyncStatus }) {
  // Track which comment IDs are currently being synced to prevent duplicate requests
  const inFlight = useRef<Set<string>>(new Set())

  // Run whenever the comments array changes
  useEffect(() => {
    // Find comments that need syncing and aren't already in progress
    const unsynced = comments.filter(
      (c) => c.syncStatus === 'local' && !inFlight.current.has(c.id),
    )
    if (unsynced.length === 0) return

    void syncComments(unsynced)
  }, [comments])

  // Step 1: Get or create the Notion database for this project
  async function getOrProvisionDatabase(): Promise<string | null> {
    // Check localStorage cache first — avoids re-provisioning on every page load
    const cached = loadConfig(projectName).notionDatabaseId
    if (cached) return cached

    try {
      const res = await fetch(`${apiUrl}/api/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName }),
      })
      if (!res.ok) throw new Error(`Provision failed: ${res.status}`)
      const data = await res.json() as { databaseId: string }
      saveConfig(projectName, { notionDatabaseId: data.databaseId })
      return data.databaseId
    } catch (err) {
      console.warn('[FeedbackWidget] Notion provisioning failed:', err)
      return null  // server unavailable — leave as local
    }
  }

  // Step 2: Upload screenshot to server Postgres, get a hosted URL back
  async function uploadScreenshot(dataUrl: string): Promise<string | null> {
    try {
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = await res.json() as { url: string }
      return data.url
    } catch {
      return null  // upload failure is non-fatal — comment syncs without screenshot
    }
  }

  // Step 3: Sync one comment to Notion
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
          x: comment.x,
          y: comment.y,
          pageUrl: comment.pageUrl,
          timestamp: comment.timestamp,
          screenshotPublicUrl,
          projectName,
          notionDatabaseId,
        }),
      })
      if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
      const data = await res.json() as { notionPageId: string }

      // Update comment with synced status and public screenshot URL
      updateSyncStatus(comment.id, 'synced', {
        notionPageId: data.notionPageId,
        screenshotPublicUrl,  // replaces local blob URL in sidebar thumbnail
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      updateSyncStatus(comment.id, 'error', { errorMessage })
    } finally {
      inFlight.current.delete(comment.id)
    }
  }

  async function syncComments(unsynced: Comment[]) {
    const notionDatabaseId = await getOrProvisionDatabase()
    if (!notionDatabaseId) return  // server unreachable — stay local

    // Sync all unsynced comments concurrently (not awaiting each one sequentially)
    for (const comment of unsynced) {
      inFlight.current.add(comment.id)
      void syncOne(comment, notionDatabaseId)
    }
  }
}
```

The `inFlight` ref prevents a comment from being synced twice. Without it, if the `comments` array changes (e.g., the sync status update triggers a re-render and therefore a new `useEffect` run), the same comment could be submitted to Notion multiple times.

---

### 4.8 FloatingButton — Drag Implementation

**`src/components/FloatingButton.tsx`**:

The drag implementation must solve two problems:
1. Distinguishing a drag from a click (both start with `mousedown`)
2. Saving position to `localStorage` without stale closure values

```typescript
const FAB_SIZE = 48
const MARGIN = 16
const STORAGE_KEY = 'df_fab_pos'

function loadPos(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as { x: number; y: number }
  } catch {}
  // Default: top-right corner
  return { x: window.innerWidth - FAB_SIZE - MARGIN, y: MARGIN + 24 }
}

export function FloatingButton({ isActive, onClick }: FloatingButtonProps) {
  const [pos, setPos] = useState(loadPos)
  const [isDragging, setIsDragging] = useState(false)

  // Refs track mutable values without triggering re-renders during drag
  const posRef = useRef(pos)        // current position for use in event handlers
  const dragging = useRef(false)    // whether a drag is in progress
  const hasMoved = useRef(false)    // whether mouse moved enough to count as a drag
  const dragOffset = useRef({ dx: 0, dy: 0 })  // offset from button center to mouse

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      hasMoved.current = true

      // Clamp to viewport bounds so button can't be lost off-screen
      const x = Math.max(MARGIN, Math.min(window.innerWidth - FAB_SIZE - MARGIN, e.clientX - dragOffset.current.dx))
      const y = Math.max(MARGIN, Math.min(window.innerHeight - FAB_SIZE - MARGIN, e.clientY - dragOffset.current.dy))

      const next = { x, y }
      posRef.current = next   // update ref synchronously (no re-render lag)
      setPos(next)            // trigger re-render to move the button
    }

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      setIsDragging(false)
      // Save final position using ref (not state) to avoid stale closure
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)) } catch {}
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])  // empty deps — listeners registered once, use refs for current values

  function handleMouseDown(e: React.MouseEvent) {
    dragging.current = true
    hasMoved.current = false
    setIsDragging(true)
    dragOffset.current = {
      dx: e.clientX - posRef.current.x,
      dy: e.clientY - posRef.current.y,
    }
    e.preventDefault()  // prevents text selection during drag
  }

  function handleClick() {
    // If the mouse moved during mousedown → mouseup, it was a drag, not a click
    if (hasMoved.current) return
    onClick()
  }

  return (
    <button
      className={`df-fab${isActive ? ' df-fab--active' : ''}${isDragging ? ' df-fab--dragging' : ''}`}
      style={{ left: pos.x, top: pos.y }}  // inline position — overrides CSS defaults
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      ...
    </button>
  )
}
```

Why `posRef` in addition to `pos` state? The `onUp` event handler is defined inside a `useEffect` with empty deps — it captures `pos` from the initial render. If it read from `pos` state directly, it would always see the initial position (stale closure). The ref is mutated synchronously on every `mousemove`, so `onUp` always reads the current position.

---

### 4.9 CommentOverlay

**`src/components/CommentOverlay.tsx`**:

```typescript
export function CommentOverlay({ onClickAt, onCancel }: CommentOverlayProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      id="df-overlay"
      className="df-overlay"
      onClick={(e) => {
        e.stopPropagation()  // prevent click from bubbling into prototype
        onClickAt(e.clientX, e.clientY)
      }}
    >
      <div className="df-overlay__hint" onClick={(e) => e.stopPropagation()}>
        <IconCrosshair />
        Click anywhere to place a comment
        <kbd>Esc</kbd> to cancel
      </div>
    </div>
  )
}
```

```css
/* Full viewport, low-opacity tint to signal comment mode */
.df-overlay {
  position: fixed;
  inset: 0;
  background: rgba(79, 70, 229, 0.06);  /* indigo tint */
  cursor: crosshair;
  pointer-events: all;
  z-index: 2147483640;
}
```

The `e.stopPropagation()` on the overlay click is important — without it, the click event would bubble up into the prototype's React tree and potentially trigger prototype interactions (buttons, links, etc.) behind the overlay.

---

### 4.10 CommentForm — Positioning & Author Persistence

The form must:
1. Appear near the pin without going off-screen
2. Auto-focus the correct input (name field for first-timers, textarea for repeat users)
3. Persist the author name after first submission

```typescript
const FORM_WIDTH = 320
const FORM_HEIGHT_ESTIMATE = 220
const MARGIN = 12

export function CommentForm({ pinX, pinY, onSubmit, onCancel }) {
  const [text, setText] = useState('')
  const [name, setName] = useState(loadAuthorName())          // pre-fill if known
  const [editingName, setEditingName] = useState(!loadAuthorName())  // show name field if unknown

  // Smart positioning: prefer right of pin, flip left if near right edge
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = pinX + 16
  let top = pinY - FORM_HEIGHT_ESTIMATE / 2

  if (left + FORM_WIDTH + MARGIN > vw) {
    left = pinX - FORM_WIDTH - 16  // flip to left side of pin
  }
  top = Math.max(MARGIN, Math.min(top, vh - FORM_HEIGHT_ESTIMATE - MARGIN))
  left = Math.max(MARGIN, Math.min(left, vw - FORM_WIDTH - MARGIN))

  useEffect(() => {
    // Focus name field for first-timers, textarea for returning users
    if (editingName) nameRef.current?.focus()
    else textareaRef.current?.focus()
  }, [editingName])

  function handleSubmit() {
    if (!text.trim() || !name.trim()) return
    saveAuthorName(name.trim())  // persist for next comment
    onSubmit(text.trim(), name.trim())
  }

  return (
    <div className="df-form" style={{ left, top }} onClick={(e) => e.stopPropagation()}>
      {editingName ? (
        <input
          placeholder="Your name"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              e.preventDefault()
              setEditingName(false)
            }
          }}
        />
      ) : (
        <div className="df-form__author">
          <span>{name}</span>
          <button onClick={() => setEditingName(true)}>Change</button>
        </div>
      )}
      <textarea placeholder="Describe the issue or feedback..." />
      <div className="df-form__footer">
        <span className="df-form__hint"><kbd>⌘</kbd>↵ to post</span>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={handleSubmit} disabled={!text.trim() || !name.trim()}>Post</button>
      </div>
    </div>
  )
}
```

---

### 4.11 Sidebar & Pull Tab

The pull tab is always rendered as its own `position: fixed` element. Its `right` CSS value transitions between `0` (closed) and `340px` (open, the sidebar width) — matching the sidebar's own slide transition exactly so they move as one unit.

```typescript
export function Sidebar({ comments, isOpen, onToggle, ... }) {
  return (
    <>
      {/* Always rendered — slides between right:0 and right:340px via CSS */}
      <button
        className={`df-sidebar__pull-tab${isOpen ? ' df-sidebar__pull-tab--open' : ''}`}
        onClick={onToggle}
      >
        {isOpen ? <IconChevronRight /> : <IconChevronLeft />}
        {isOpen && comments.length > 0 && (
          <span className="df-sidebar__pull-tab-count">{comments.length}</span>
        )}
      </button>

      {/* Sidebar panel — independently fixed to right edge */}
      <div className={`df-sidebar${isOpen ? ' df-sidebar--open' : ''}`}>
        ...
      </div>
    </>
  )
}
```

```css
.df-sidebar__pull-tab {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  /* Transition matches sidebar duration and easing exactly */
  transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.12s ease;
  z-index: 2147483645;  /* above sidebar so it's always clickable */
}

.df-sidebar__pull-tab--open {
  right: 340px;  /* sidebar width — sticks to left edge when open */
}

.df-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 340px;
  height: 100%;
  transform: translateX(100%);  /* off-screen right when closed */
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2147483644;
}

.df-sidebar--open {
  transform: translateX(0);
}
```

The z-index on the pull tab (`2147483645`) is one above the sidebar (`2147483644`) so the tab always remains clickable even as the sidebar slides over it.

---

### 4.12 CommentCard — Sync Status Display

```typescript
export function CommentCard({ comment }: { comment: Comment }) {
  // Prefer public URL (hosted on server) over local blob (in localStorage)
  const screenshotSrc = comment.screenshotPublicUrl ?? comment.screenshotDataUrl

  return (
    <div className="df-card">
      <div className="df-card__meta">
        <span className="df-card__author">{comment.authorName}</span>
        <span className="df-card__time" title={formatAbsolute(comment.timestamp)}>
          {formatRelative(comment.timestamp)}
        </span>
      </div>
      <p className="df-card__text">{comment.text}</p>
      {screenshotSrc && (
        <div className="df-card__screenshot" onClick={() => window.open(screenshotSrc, '_blank')}>
          <img src={screenshotSrc} alt="Screenshot" loading="lazy" />
        </div>
      )}
      <SyncBadge status={comment.syncStatus} error={comment.errorMessage} />
    </div>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
```

The `loading="lazy"` attribute on the screenshot thumbnail is important — there could be many comments with screenshots, and loading them all eagerly would spike network activity when the sidebar opens.

---

### 4.13 Style Isolation Strategy

The entire widget stylesheet uses two isolation techniques:

**1. `#df-root` root reset:**
```css
#df-root {
  position: fixed;
  top: 0; left: 0;
  width: 0; height: 0;    /* takes up no layout space */
  overflow: visible;       /* children render outside bounds */
  pointer-events: none;    /* transparent to clicks by default */
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #111827;
  box-sizing: border-box;
  z-index: 2147483647;     /* maximum possible z-index */
}

/* All children inherit border-box */
#df-root *, #df-root *::before, #df-root *::after {
  box-sizing: border-box;
}
```

**2. `df-` class namespace:**
All class names use a `df-` prefix. This is a simple but effective convention — no CSS Module hashing required, and it's readable in DevTools.

Interactive elements opt into pointer events explicitly:
```css
.df-fab,
.df-sidebar,
.df-sidebar__pull-tab,
.df-form,
.df-overlay {
  pointer-events: all;
}
```

---

## 5. The Server — Full Technical Breakdown

### 5.1 Why a Server Exists

Two hard constraints require a server:

**CORS:** The Notion API rejects direct browser requests with a CORS error. Notion intentionally does not set `Access-Control-Allow-Origin` headers for browser clients. A server proxy is not optional.

**Secret protection:** The Notion integration token must never appear in the browser. In the current architecture, the token lives only in the Nanoservice secrets store (AWS Secrets Manager) and is injected as an environment variable. It is never in the build output, never in localStorage, and never transmitted to the client.

### 5.2 Express App Setup

**`server/src/index.ts`**:

```typescript
import 'dotenv/config'   // loads .env into process.env for local dev
import express from 'express'
import cors from 'cors'
import { initDb, saveScreenshot, getScreenshot } from './db.js'
import { provisionDatabase, syncComment } from './notion.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

// CORS: in production, restrict to known prototype URLs.
// In dev, '*' allows localhost:5173 etc.
const rawOrigins = process.env.CORS_ORIGINS ?? '*'
const allowedOrigins = rawOrigins === '*' ? '*' : rawOrigins.split(',').map(s => s.trim())

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))

// 2MB limit for base64 screenshot payloads
// 600x450 JPEG at 0.82 quality ≈ 50-150KB raw → ~67-200KB base64
// 2MB gives comfortable headroom
app.use(express.json({ limit: '2mb' }))
```

### 5.3 Postgres — Screenshot Storage

**`server/src/db.ts`**:

```typescript
import pg from 'pg'
const { Pool } = pg

// DATABASE_URL is injected automatically by the Nanoservice platform.
// For local dev, set it in server/.env pointing at a local Postgres instance.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },  // required for Aurora SSL
})

// Called at server startup — creates the table if it doesn't exist.
// Safe to call on every startup — IF NOT EXISTS is idempotent.
export async function initDb(): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS screenshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data TEXT NOT NULL,      -- base64 data URL string
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
  )
}

export async function saveScreenshot(dataUrl: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    'INSERT INTO screenshots (data) VALUES ($1) RETURNING id',
    [dataUrl],
  )
  return result.rows[0].id  // UUID string e.g. "a3f9c2d1-4b5e-..."
}

export async function getScreenshot(id: string): Promise<string | null> {
  const result = await pool.query<{ data: string }>(
    'SELECT data FROM screenshots WHERE id = $1',
    [id],
  )
  return result.rows[0]?.data ?? null
}
```

The `gen_random_uuid()` function is a Postgres built-in (available in Postgres 13+). It generates a cryptographically random UUID, which means screenshot IDs are unguessable — you can't enumerate all screenshots by incrementing a counter.

### 5.4 Screenshot Routes

```typescript
// Store a screenshot and return its hosted URL
app.post('/api/upload', async (req, res) => {
  const { dataUrl } = req.body as { dataUrl?: string }

  if (!dataUrl?.startsWith('data:image/')) {
    res.status(400).json({ error: 'dataUrl must be a valid image data URL' })
    return
  }

  const id = await saveScreenshot(dataUrl)

  // SERVER_URL must be the public TailScale URL of this server.
  // Falls back to deriving from request (works behind most reverse proxies).
  const serverUrl = process.env.SERVER_URL ?? `${req.protocol}://${req.get('host')}`
  res.json({ url: `${serverUrl}/api/screenshot/${id}` })
})

// Serve a screenshot as image bytes (not base64)
app.get('/api/screenshot/:id', async (req, res) => {
  const dataUrl = await getScreenshot(req.params.id)

  if (!dataUrl) {
    res.status(404).json({ error: 'Screenshot not found' })
    return
  }

  // Parse "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  const commaIndex = dataUrl.indexOf(',')
  const header = dataUrl.slice(0, commaIndex)          // "data:image/jpeg;base64"
  const base64 = dataUrl.slice(commaIndex + 1)         // "/9j/4AAQSkZJRg..."
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'

  res.set('Content-Type', mimeType)
  // 'immutable' tells browsers: this URL's content never changes. Cache forever.
  // Screenshot IDs are UUIDs — if content changed, a new UUID would be used.
  res.set('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(Buffer.from(base64, 'base64'))
})
```

### 5.5 Notion Client Setup

**`server/src/notion.ts`**:

```typescript
import { Client } from '@notionhq/client'

// Client is instantiated once at module load time.
// NOTION_TOKEN is pulled from environment — never from request data.
const notion = new Client({ auth: process.env.NOTION_TOKEN })

// All databases are created under this shared parent page.
// The Notion integration must have been invited to this page.
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID!
```

### 5.6 Notion Database Provisioning

Called once per project on the first comment. Creates a structured database under the parent page:

```typescript
export async function provisionDatabase(projectName: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    title: [{ type: 'text', text: { content: `${projectName} Feedback` } }],
    properties: {
      // Title property — required in every Notion database
      // This is the "Comment" column — stores truncated comment text for scanning
      Comment: { title: {} },

      // Full text for comments longer than 100 chars
      'Full Text': { rich_text: {} },

      // The URL of the prototype page where the comment was placed
      'Page URL': { url: {} },

      // Position as percentage of viewport (0.0-1.0 in Notion's percent format)
      'Position X': { number: { format: 'percent' } },
      'Position Y': { number: { format: 'percent' } },

      // Exact timestamp — Notion date type supports time
      Date: { date: {} },

      // Workflow status for the design team to track resolution
      Status: {
        select: {
          options: [
            { name: 'New', color: 'blue' },
            { name: 'In Review', color: 'yellow' },
            { name: 'Resolved', color: 'green' },
          ],
        },
      },

      // TailScale URL to the screenshot — clickable for anyone on VPN
      Screenshot: { url: {} },
    },
  })

  // Return just the database ID string — e.g. "abc123def456..."
  return db.id
}
```

The Notion API returns a full database object. We only need the `id` field, which gets cached in the browser's localStorage to avoid re-provisioning.

### 5.7 Notion Comment Sync

Creates one Notion page (row) per comment:

```typescript
export async function syncComment(params: SyncCommentParams): Promise<string> {
  const { text, x, y, pageUrl, timestamp, screenshotPublicUrl, notionDatabaseId } = params

  // Notion's title field has a practical limit — truncate long comments
  const truncatedTitle = text.length > 100 ? text.slice(0, 97) + '...' : text

  const page = await notion.pages.create({
    parent: { database_id: notionDatabaseId },
    properties: {
      Comment: {
        title: [{ text: { content: truncatedTitle } }],
      },
      'Full Text': {
        rich_text: [{ text: { content: text } }],
      },
      'Page URL': {
        url: pageUrl,
      },
      'Position X': {
        // Notion stores percent values as 0-1 (e.g. 42% → 0.42)
        number: x / 100,
      },
      'Position Y': {
        number: y / 100,
      },
      Date: {
        // Notion date type accepts ISO 8601 strings directly
        date: { start: timestamp },
      },
      Status: {
        select: { name: 'New' },
      },
      Screenshot: {
        // null if no screenshot — Notion handles null url properties gracefully
        url: screenshotPublicUrl ?? null,
      },
    },
  })

  return page.id
}
```

### 5.8 Full Request → Notion Flow

Here is every network call that happens from click to Notion, with the exact payloads:

**Request 1: Provision (first comment only)**

```
POST /api/provision
Content-Type: application/json

{ "projectName": "agenda-prototype-v2" }

→ 200 OK
{ "databaseId": "abc123def456789012345678901234ab" }
```

The widget caches `databaseId` in `localStorage` under `df_config_agenda-prototype-v2`. All future comments skip this call.

**Request 2: Upload screenshot**

```
POST /api/upload
Content-Type: application/json

{
  "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
          // ~100-200KB of base64 text
}

→ 200 OK
{
  "url": "https://feedback-server-abc.internal/api/screenshot/a3f9c2d1-4b5e-7890-abcd-ef1234567890"
}
```

Server inserts the `dataUrl` into Postgres, generates a UUID, constructs the URL from `SERVER_URL` env var.

**Request 3: Sync to Notion**

```
POST /api/sync
Content-Type: application/json

{
  "commentId": "1746614400000-x7k2mq",
  "text": "The appointment card could use more visual weight on the patient name",
  "x": 38.4,
  "y": 52.1,
  "pageUrl": "https://agenda-v2-xyz.internal/",
  "timestamp": "2026-05-07T14:32:00.000Z",
  "screenshotPublicUrl": "https://feedback-server-abc.internal/api/screenshot/a3f9...",
  "projectName": "agenda-prototype-v2",
  "notionDatabaseId": "abc123def45678901234567890 1234ab"
}

→ 200 OK
{ "notionPageId": "xyz789abc12345678901234567890 1cd" }
```

Server calls `notion.pages.create()` and returns the created page's ID.

---

## 6. Data Flow — Comment Lifecycle End to End

```
┌──────────────────────────────────────────────────┐
│  1. ENTER COMMENT MODE                            │
│     User clicks FloatingButton                    │
│     isCommentMode = true                          │
│     CommentOverlay renders (full-viewport,        │
│     crosshair cursor)                             │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  2. CLICK → SCREENSHOT                            │
│     User clicks at clientX=580, clientY=340       │
│     CommentOverlay.onClick fires                  │
│     html2canvas captures 600x450px region         │
│     centered on (580, 340)                        │
│     Widget DOM excluded via ignoreElements:       │
│     el.id === 'df-root'                           │
│     Returns: "data:image/jpeg;base64,/9j/4AAQ..." │
│                                                   │
│     pendingPin = {                                │
│       x: 580, y: 340,  ← px, for DOM positioning │
│       xPct: 36.25, yPct: 47.2,  ← %, stored      │
│       screenshotDataUrl: "data:image/jpeg;..."    │
│     }                                             │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  3. FORM OPENS                                    │
│     Pin dot renders at position (580, 340)        │
│     CommentForm renders at (596, 250) —           │
│     16px right of pin, vertically centered,       │
│     clamped to viewport                           │
│     Name field auto-focuses (first time) or       │
│     textarea (returning user)                     │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  4. SUBMIT                                        │
│     User types name "Jane Smith" + feedback text, │
│     clicks Post                                   │
│     saveAuthorName("Jane Smith") →                │
│     localStorage: df_author_name                  │
│     onSubmit("The appointment card needs...",     │
│     "Jane Smith") fires                           │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  5. SAVE LOCAL — IMMEDIATE, SYNCHRONOUS           │
│     addComment() creates:                         │
│     {                                             │
│       id: "1746614520000-x7k2mq",                 │
│       x: 36.25, y: 47.2,                          │
│       text: "The appointment card needs...",      │
│       authorName: "Jane Smith",                   │
│       timestamp: "2026-05-07T14:32:00.000Z",      │
│       pageUrl: "http://localhost:5199/demo/...",  │
│       screenshotDataUrl: "data:image/jpeg,...",   │
│       syncStatus: "local"                         │
│     }                                             │
│                                                   │
│     Saved to localStorage: df_comments_agenda-... │
│     Sidebar opens. Comment appears with Local     │
│     badge. pendingPin cleared.                    │
│     isCommentMode = false.                        │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  6. SYNC BEGINS                                   │
│     useNotionSync detects syncStatus: 'local'     │
│     commentId added to inFlight set               │
│     (prevents duplicate sync)                     │
│     updateSyncStatus(id, 'syncing') →             │
│     badge changes to Syncing...                   │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  7. PROVISION (first comment only)                │
│     localStorage has no notionDatabaseId          │
│     POST /api/provision {"projectName":"..."}     │
│     Server calls notion.databases.create()        │
│     Returns: {"databaseId":"abc123..."}           │
│     Cached: localStorage df_config_agenda-...     │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  8. UPLOAD SCREENSHOT                             │
│     POST /api/upload {"dataUrl":"data:image/..."}│
│     Server: pool.query INSERT INTO screenshots    │
│     Postgres generates UUID: "a3f9c2d1-..."       │
│     Server returns: {"url":"https://server.../.."}│
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  9. SYNC TO NOTION                                │
│     POST /api/sync {text, x, y, pageUrl,          │
│     timestamp, screenshotPublicUrl,               │
│     notionDatabaseId}                             │
│     Server calls notion.pages.create()            │
│     Returns: {notionPageId: "xyz789..."}          │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│  10. COMPLETE                                     │
│      updateSyncStatus(id, 'synced', {             │
│        notionPageId: "xyz789...",                 │
│        screenshotPublicUrl: "https://server/..."  │
│      })                                           │
│      Comment badge changes to ✓ Notion            │
│      Screenshot thumbnail upgrades from local     │
│      base64 to hosted URL                         │
│      Comment persisted in localStorage with all   │
│      final fields                                 │
└──────────────────────────────────────────────────┘
```

---

## 7. Key Design Decisions & Tradeoffs

### Local-first, async sync

Comments save to localStorage instantly. The UI never blocks on network. If the server is unavailable, the widget continues to work — comments accumulate locally and sync automatically when the server is reachable again (on next page load, the sync hook finds `syncStatus: 'local'` comments and retries).

**Tradeoff:** Comments are browser-local until synced. A reviewer on a different device won't see unsynced comments from another device.

### Per-project Notion databases

Each `projectName` gets its own Notion database. Feedback for different prototypes stays separate and is easy to archive by project.

**Tradeoff:** Changing `projectName` after comments exist creates a new database. Old comments remain in the old one. The `notionDatabaseId` cached in localStorage will mismatch for anyone who had the old project cached.

### Screenshots in Postgres, not a CDN

Screenshots are stored in a self-hosted Postgres database instead of a third-party service (originally Cloudinary). No external account needed, and the data stays within your own infrastructure.

**Tradeoff:** Screenshots can't be embedded inline in Notion — Notion's servers can't reach a privately-networked URL. They appear as clickable links instead. This is acceptable if your team has access to the server's network (e.g. via VPN or TailScale).

### Notion database ID cached in localStorage

Provisioning happens once per project per browser. The database ID is stored in `localStorage` under `df_config_{projectName}`. This avoids calling the Notion API on every page load.

**Tradeoff:** Clearing localStorage causes re-provisioning and creates a duplicate Notion database. The Settings panel has a "Reset Notion database" button to handle this edge case — it clears the cached ID, and the next comment re-provisions into a fresh database.

### No authentication layer

The widget treats everyone as a commenter. The Notion token is protected server-side. If the server is network-gated (e.g. VPN or TailScale), access is implicitly scoped to your team.

**Tradeoff:** Any Elation employee who knows the TailScale URL can submit comments. Author names are self-reported and unverified.

---

## 8. Deployment Model

```
Your Network (VPN / public, depending on your setup)
─────────────────────────────────────────────────────────────────

Feedback Server                      (deploy once, forever)
  URL:     https://your-feedback-server.example.com
  Env vars:
    NOTION_TOKEN           → set in your hosting platform
    NOTION_PARENT_PAGE_ID  → set in your hosting platform
    SERVER_URL             → public URL of this server
    DATABASE_URL           → Postgres connection string
  Database: Postgres (any provider: Supabase, Railway, Neon, etc.)

Hosting options: Railway, Render, Fly.io, or any Node.js host

─────────────────────────────────────────────────────────────────

Prototype A                          (per prototype)
  URL:  https://your-prototype-a.example.com
  Env:  VITE_FEEDBACK_API_URL = https://your-feedback-server.example.com

Prototype B                          (per prototype)
  URL:  https://your-prototype-b.example.com
  Env:  VITE_FEEDBACK_API_URL = https://your-feedback-server.example.com
```

The server handles multiple prototypes simultaneously — each prototype just uses a different `projectName`, which maps to a different Notion database. There's no per-prototype configuration on the server.

---

## 9. Step-by-Step Setup — From Zero to Working

### 9.1 Prerequisites

Before starting, confirm you have:

- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] A Postgres database (local, [Supabase](https://supabase.com), [Neon](https://neon.tech), [Railway](https://railway.app), etc.)
- [ ] A hosting platform for the server (Railway, Render, Fly.io, or similar)
- [ ] Access to [notion.so/my-integrations](https://www.notion.so/my-integrations)

---

### 9.2 Notion Integration Setup

**Create the integration:**

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name: `Design Feedback` (or similar)
4. Associated workspace: select your Elation workspace
5. Capabilities: ensure **Read content**, **Update content**, **Insert content** are all checked
6. Click **Submit**
7. Copy the **Internal Integration Token** — it starts with `secret_`

This is your `NOTION_TOKEN`. **Treat it like a password — never commit it to git.**

**Create the parent page:**

1. Open Notion and create a new page (or use an existing one) to act as the container for all prototype feedback databases
2. Suggested name: `Prototype Feedback`
3. Open the page → click **Share** (top right) → **Invite** → search for `Design Feedback` (your integration name) → **Invite**
4. Copy the page URL. It looks like: `https://www.notion.so/Prototype-Feedback-abc123def45678901234567890 1234ab`
5. The ID is the last 32 characters of the URL path: `abc123def45678901234567890 1234ab`

This is your `NOTION_PARENT_PAGE_ID`.

---

### 9.3 Deploy the Feedback Server

The server is a one-time deployment. All prototypes share it.

**Navigate to the server directory and install dependencies:**

```bash
cd ~/design-feedback/server
npm install
```

**Set your environment variables** on your hosting platform (Railway, Render, Fly.io, etc.) or in a `server/.env` file for local testing:

```bash
NOTION_TOKEN=secret_xxxxx...
NOTION_PARENT_PAGE_ID=abc123def456789012345678901234ab
SERVER_URL=https://your-feedback-server.example.com
DATABASE_URL=postgresql://user:password@host:5432/dbname
CORS_ORIGINS=*
```

**Deploy** using your platform's CLI or dashboard. For example, with Railway:

```bash
railway up
```

Or with Render/Fly.io, connect the `server/` directory via their dashboard or CLI.

**Save the deployed URL** (e.g. `https://your-feedback-server.example.com`) — this becomes `VITE_FEEDBACK_API_URL` for every prototype and the `SERVER_URL` env var on the server itself.

**Verify it's working:**

```bash
curl https://your-feedback-server.example.com/health
```

You should see:

```json
{ "status": "ok", "timestamp": "2026-05-07T14:00:00.000Z" }
```

---

### 9.4 Install the Widget on a Prototype

Do this for each new prototype.

**From your prototype's root directory:**

```bash
# Install directly from a local path (during development)
npm install /path/to/design-feedback

# OR — from GitHub:
npm install github:your-username/design-feedback

# OR — once published to npm:
npm install design-feedback-widget
```

**Create or edit `.env` in your prototype root:**

```bash
VITE_FEEDBACK_API_URL=https://feedback-server-abc123.internal
```

**Add the widget to your app:**

Open your prototype's `App.jsx` (or `main.tsx`) and add:

```tsx
// Add this import at the top
import { FeedbackWidget } from 'design-feedback-widget'

// Add this inside your component's return, as the last child before </>
function App() {
  return (
    <>
      <YourPrototypeContent />

      <FeedbackWidget
        projectName="your-prototype-name-here"
        apiUrl={import.meta.env.VITE_FEEDBACK_API_URL}
      />
    </>
  )
}
```

**Choose `projectName` carefully:**
- Use a slug: lowercase, hyphens, no spaces — e.g. `"agenda-redesign-v2"`, `"patient-schedule-may-2026"`
- It becomes the Notion database name: `"agenda-redesign-v2 Feedback"`
- If you change it later, a new Notion database is created

**Test locally:**

```bash
npm run dev
```

Open `http://localhost:5173`. You should see the dark circular button in the top-right corner. Click it, click anywhere on the page, enter your name and a test comment, and post it.

Check the sidebar — the comment should appear with a `Local` badge. If the local server is running (`npm run server:dev`), the badge should change to `Syncing...` and then `Notion ✓` within a few seconds.

---

### 9.5 Deploy the Prototype

**Build the prototype:**

```bash
npm run build
# Output goes to dist/
```

**Deploy the `dist/` folder** as a static site using any static hosting provider (Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc.) or your own server.

**Share the URL with your team.** Anyone with access can open it and leave feedback immediately — no setup required on the reviewer's side.

---

### 9.6 Verify Everything Works

Run through this checklist after deployment:

**Server:**
- [ ] `https://your-feedback-server.example.com/health` returns `{"status":"ok"}`
- [ ] No warnings about missing env vars in your hosting platform's logs

**Widget — first comment flow:**
- [ ] Floating button appears in top-right corner (or wherever it was last dragged)
- [ ] Clicking enters comment mode (indigo overlay, crosshair cursor, hint banner)
- [ ] Clicking on the page shows the pin dot and comment form
- [ ] Comment form positions itself correctly (doesn't go off-screen at edges)
- [ ] Name input appears on first comment; pre-fills on subsequent comments
- [ ] Posting a comment: form closes, sidebar opens, comment appears with `Local` badge
- [ ] Badge transitions: `Local` → `Syncing...` → `Notion ✓`
- [ ] Screenshot thumbnail appears in sidebar
- [ ] Pull tab shows correct comment count

**Notion:**
- [ ] A new database named `"{projectName} Feedback"` appears under your parent page
- [ ] The database has the correct columns: Comment, Full Text, Page URL, Position X, Position Y, Date, Status, Screenshot
- [ ] The comment row has all fields populated
- [ ] The Screenshot column contains a clickable URL
- [ ] Clicking the Screenshot URL opens the image in the browser

**Drag behavior:**
- [ ] Floating button can be dragged to any position
- [ ] Dragging does not trigger comment mode
- [ ] Button position persists after page refresh

---

## 10. Running Locally

For development and testing without deploying.

**Terminal 1 — Widget demo:**

```bash
cd ~/design-feedback
npm install
npm run demo
# Opens at http://localhost:5199/demo/index.html
```

This runs the demo prototype with the widget loaded directly from source (no build step). Changes to any file in `src/` hot-reload instantly.

**Terminal 2 — Feedback server (optional, for Notion sync testing):**

```bash
cd ~/design-feedback/server
npm install
cp .env.example .env
# Edit .env with your NOTION_TOKEN, NOTION_PARENT_PAGE_ID, DATABASE_URL
npm run dev
# Server starts at http://localhost:3001
```

For local Postgres, install it with `brew install postgresql@16` and create a database:

```bash
createdb design_feedback
```

Then set `DATABASE_URL=postgresql://localhost:5432/design_feedback` in `server/.env`.

**Without the server running:** Comments will save locally and show `Local` status. They'll sync when the server is next available. This is useful for testing the widget UI without any backend.

**Build the widget package:**

```bash
npm run build
# Output in dist/
# dist/index.mjs  — ESM
# dist/index.cjs  — CommonJS
# dist/index.css  — Styles
# dist/index.d.ts — TypeScript declarations
```

**Type-check:**

```bash
npm run typecheck   # widget
cd server && npx tsc --noEmit  # server
```

---

## 11. Troubleshooting

### Comments stuck at "Local"

**Symptom:** Comments post successfully to the sidebar but never progress past the `Local` badge.

**Diagnosis:**
1. Hit the health endpoint: `https://your-feedback-server.example.com/health`
2. Check your hosting platform's logs for startup errors

**Common causes:**
- Server not running or deployment failed
- Missing environment variables — server logs will show `⚠ NOTION_TOKEN not set`
- CORS misconfiguration — check `CORS_ORIGINS` includes your prototype's URL

---

### Comments stuck at "Sync failed"

**Symptom:** Badge shows red `Sync failed`.

**Diagnosis:** Open browser DevTools → Network tab → look for failed requests to `/api/provision`, `/api/upload`, or `/api/sync`. The response body will contain an error message.

**Common causes:**
- `NOTION_TOKEN` has insufficient permissions (check integration capabilities in Notion settings)
- `NOTION_PARENT_PAGE_ID` is wrong — must be the 32-char ID, not the full URL
- Integration has not been invited to the parent Notion page

---

### New Notion database created on every comment

**Symptom:** Multiple databases named `"my-project Feedback"` appear in Notion.

**Cause:** The `notionDatabaseId` in localStorage is being cleared between sessions (private browsing, manually cleared, or different browsers).

**Fix:** The Settings panel (gear icon in sidebar) shows whether a database is provisioned. If you need to reuse an existing database, manually add its ID to localStorage:

```javascript
// In browser console on the prototype:
localStorage.setItem(
  'df_config_your-project-name',
  JSON.stringify({ notionDatabaseId: 'paste-existing-database-id-here' })
)
```

---

### Floating button is off-screen

**Symptom:** The drag position saved in localStorage places the button off the current viewport.

**Fix:** In browser console:
```javascript
localStorage.removeItem('df_fab_pos')
// Reload the page — button resets to default top-right position
```

---

### Server URL changed

If you redeployed the server at a new URL, update the `SERVER_URL` environment variable on the server and update `VITE_FEEDBACK_API_URL` in each prototype's `.env`, then rebuild and redeploy the prototypes.

---

### Screenshot thumbnail missing in Notion

Screenshots appear in the sidebar from `screenshotDataUrl` (local) even if the Notion row shows no Screenshot URL. This means the upload to Postgres succeeded but the URL stored in Notion is wrong.

**Check:** Is `SERVER_URL` set correctly in the server's environment variables? It must be the full public URL of the server (e.g. `https://your-feedback-server.example.com`), not `http://localhost:3001`.

---

## 12. Extending the Widget

### Add comment resolution in the sidebar

1. Add `status: 'open' | 'resolved'` to the `Comment` type
2. Add a "Resolve" button to `CommentCard` that calls `updateComment(id, { status: 'resolved' })`
3. Style resolved comments differently (muted text, strikethrough)
4. Map to the Notion `Status` property in `server/src/notion.ts` — pass `status` in the sync body

### Support multiple prototype pages (SPA routing)

Currently `pageUrl` captures `window.location.href` at comment time — this already works for SPAs. Add `pageTitle: document.title` to the `Comment` type and show it in `CommentCard` so reviewers can identify which route a comment came from without reading the full URL.

### External image hosting (inline Notion screenshots)

By default, screenshots are served from your own server — Notion can't embed them inline because they're not publicly accessible. To get inline screenshot embeds in Notion, upload to a public image host instead of Postgres:

```typescript
// in server/src/upload.ts (new file)
export async function uploadToImageHost(dataUrl: string): Promise<string> {
  const [, base64] = dataUrl.split(',')
  const buffer = Buffer.from(base64, 'base64')

  // Replace with your image host of choice (Cloudinary, S3, Uploadcare, etc.)
  const response = await fetch('https://your-image-host.example.com/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: buffer,
  })
  const { url } = await response.json() as { url: string }
  return url
}
```

The returned URL must be publicly accessible so Notion's servers can fetch it. Update `notion.ts` to use `children: [{ type: 'image', image: { type: 'external', external: { url: screenshotPublicUrl } } }]` in `pages.create()`.

### Owner-gated settings panel

Add an `ownerPassphrase` prop to `FeedbackWidget`. Store a hashed version in `VITE_FEEDBACK_OWNER_PASSPHRASE` (build-time env var). The settings gear prompts for a passphrase; matching it sets `isOwner: true` in localStorage. Non-owners see the comment button and sidebar, but not the gear icon.

```tsx
<FeedbackWidget
  projectName="my-prototype"
  apiUrl={import.meta.env.VITE_FEEDBACK_API_URL}
  ownerPassphrase={import.meta.env.VITE_FEEDBACK_OWNER_PASSPHRASE}
/>
```

---

*Built May 2026. Setup guide in `README.md`.*
