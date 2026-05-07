import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb, saveScreenshot, getScreenshot } from './db.js'
import { provisionDatabase, syncComment } from './notion.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

const rawOrigins = process.env.CORS_ORIGINS ?? '*'
const allowedOrigins = rawOrigins === '*' ? '*' : rawOrigins.split(',').map((s) => s.trim())

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
)

app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/api/provision', async (req, res) => {
  const { projectName } = req.body as { projectName?: string }

  if (!projectName?.trim()) {
    res.status(400).json({ error: 'projectName is required' })
    return
  }

  try {
    const databaseId = await provisionDatabase(projectName.trim())
    res.json({ databaseId })
  } catch (err) {
    console.error('[provision] error:', err)
    res.status(500).json({ error: 'Failed to provision Notion database' })
  }
})

app.post('/api/upload', async (req, res) => {
  const { dataUrl } = req.body as { dataUrl?: string }

  if (!dataUrl?.startsWith('data:image/')) {
    res.status(400).json({ error: 'dataUrl must be a valid image data URL' })
    return
  }

  try {
    const id = await saveScreenshot(dataUrl)
    const serverUrl = process.env.SERVER_URL ?? `${req.protocol}://${req.get('host')}`
    res.json({ url: `${serverUrl}/api/screenshot/${id}` })
  } catch (err) {
    console.error('[upload] error:', err)
    res.status(500).json({ error: 'Failed to save screenshot' })
  }
})

app.get('/api/screenshot/:id', async (req, res) => {
  try {
    const dataUrl = await getScreenshot(req.params.id)

    if (!dataUrl) {
      res.status(404).json({ error: 'Screenshot not found' })
      return
    }

    const commaIndex = dataUrl.indexOf(',')
    const header = dataUrl.slice(0, commaIndex)
    const base64 = dataUrl.slice(commaIndex + 1)
    const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'

    res.set('Content-Type', mimeType)
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.send(Buffer.from(base64, 'base64'))
  } catch (err) {
    console.error('[screenshot] error:', err)
    res.status(500).json({ error: 'Failed to retrieve screenshot' })
  }
})

app.post('/api/sync', async (req, res) => {
  const {
    commentId,
    text,
    authorName,
    x,
    y,
    pageUrl,
    timestamp,
    screenshotPublicUrl,
    notionDatabaseId,
  } = req.body as {
    commentId?: string
    text?: string
    authorName?: string
    x?: number
    y?: number
    pageUrl?: string
    timestamp?: string
    screenshotPublicUrl?: string
    notionDatabaseId?: string
  }

  if (!text || !notionDatabaseId || x == null || y == null) {
    res.status(400).json({ error: 'text, notionDatabaseId, x, and y are required' })
    return
  }

  try {
    const notionPageId = await syncComment({
      text,
      authorName: authorName ?? 'Anonymous',
      x,
      y,
      pageUrl: pageUrl ?? '',
      timestamp: timestamp ?? new Date().toISOString(),
      screenshotPublicUrl,
      notionDatabaseId,
    })

    res.json({ notionPageId, commentId })
  } catch (err) {
    console.error('[sync] error:', err)
    res.status(500).json({ error: 'Failed to sync comment to Notion' })
  }
})

async function start() {
  if (!process.env.NOTION_TOKEN) {
    console.warn('⚠  NOTION_TOKEN not set — Notion sync will fail')
  }
  if (!process.env.NOTION_PARENT_PAGE_ID) {
    console.warn('⚠  NOTION_PARENT_PAGE_ID not set — database provisioning will fail')
  }
  if (!process.env.DATABASE_URL) {
    console.warn('⚠  DATABASE_URL not set — screenshot storage will fail')
  }

  await initDb()
  app.listen(PORT, () => {
    console.log(`Feedback server listening on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
