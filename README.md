# Design Feedback Widget

An embeddable feedback widget for Vite + React prototypes. Reviewers click to annotate directly on the page — comments are captured with screenshots and synced to a Notion database automatically.

## How it works

1. Add `<FeedbackWidget />` to any Vite + React prototype
2. Reviewers click the floating button → click anywhere on the page → type feedback → post
3. A screenshot of the clicked area is captured automatically
4. Comments appear in a sidebar instantly (local-first, no page reload)
5. Everything syncs to a dedicated Notion database in the background

## Quick start

### 1. Set up Notion

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) → **New integration**
2. Name it, select your workspace, enable Read/Update/Insert content → **Submit**
3. Copy the **Internal Integration Token** (starts with `secret_`)
4. Create a Notion page to hold all feedback databases (e.g. "Prototype Feedback")
5. Share that page with your integration: **Share → Invite → [your integration name]**
6. Copy the page ID from the URL (the 32-char hex string at the end)

### 2. Deploy the server

The server proxies Notion (which blocks direct browser requests) and stores screenshots.

```bash
cd server
npm install
cp .env.example .env
# Fill in NOTION_TOKEN, NOTION_PARENT_PAGE_ID, DATABASE_URL, SERVER_URL
npm run dev
```

Deploy to Railway, Render, Fly.io, or any Node.js host. Set the same env vars there.

### 3. Add the widget to your prototype

```bash
# From your prototype directory
npm install /path/to/design-feedback-plugin

# or once published:
npm install design-feedback-widget
```

```tsx
// In your prototype's App.tsx
import { FeedbackWidget } from 'design-feedback-widget'

function App() {
  return (
    <>
      <YourPrototypeContent />
      <FeedbackWidget
        projectName="your-prototype-name"
        apiUrl={import.meta.env.VITE_FEEDBACK_API_URL}
      />
    </>
  )
}
```

Add to your `.env`:
```
VITE_FEEDBACK_API_URL=https://your-feedback-server.example.com
```

### 4. Run the demo locally

```bash
npm install
npm run demo
# Opens at http://localhost:5199
```

## Props

| Prop | Type | Description |
|---|---|---|
| `projectName` | `string` | Slug identifying this prototype (e.g. `"agenda-v2"`). Becomes the Notion database name. |
| `apiUrl` | `string` | URL of the deployed feedback server. |

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a full technical breakdown of every component, hook, data flow, and design decision.

## Server environment variables

| Variable | Description |
|---|---|
| `NOTION_TOKEN` | Notion integration token (`secret_...`) |
| `NOTION_PARENT_PAGE_ID` | ID of the Notion page to create databases under |
| `SERVER_URL` | Public URL of this server (used to construct screenshot URLs) |
| `DATABASE_URL` | Postgres connection string |
| `CORS_ORIGINS` | Allowed origins, comma-separated, or `*` |
| `PORT` | Port to listen on (default: `3001`) |

## Notion rate limits

The Notion API allows 3 requests/second (all plans including Enterprise). The widget syncs comments sequentially with a 350ms gap between calls, staying safely within limits even if many comments queue up offline.

## License

MIT
