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

1. Open Notion → **Settings** → **Connections** → **Develop or manage integrations** → **New integration**
2. Name it (e.g. "Design Feedback Widget"), select your workspace, click **Save**
3. Copy the **Internal Integration Secret** (starts with `secret_`)
4. Create a Notion page to hold all feedback databases (e.g. "Prototype Feedback")
5. Open that page → click `•••` → **Connections** → connect your integration
6. Copy the page ID from the URL: `notion.so/Your-Page-`**`abc123...`** (the 32-char hex at the end)

### 2. Set up the server

```bash
cd server
npm install
cp .env.example .env
```

Open `server/.env` and fill in:

```
NOTION_TOKEN=secret_your_token_here
NOTION_PARENT_PAGE_ID=your_page_id_here
```

Optionally add a `DATABASE_URL` for screenshot storage (see [Screenshot storage](#screenshot-storage) below).

```bash
npm run dev
# Server running at http://localhost:3001
```

### 3. Add the widget to your prototype

```bash
npm install design-feedback-widget
```

```tsx
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

Add to your prototype's `.env`:
```
VITE_FEEDBACK_API_URL=https://your-feedback-server.example.com
```

### 4. Run the demo locally

```bash
npm install
npm run demo
# Opens at http://localhost:5199
```

---

## Screenshot storage

Screenshots require a PostgreSQL database. Without one the widget still works — comments sync to Notion, they just won't include screenshots.

Add `DATABASE_URL` to `server/.env` using whichever option suits you:

### Supabase (recommended — free tier)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string → URI**
3. Copy the URI and replace `[YOUR-PASSWORD]` with your database password

```
DATABASE_URL=postgresql://postgres:yourpassword@db.xxxx.supabase.co:5432/postgres
```

### Neon (free tier, serverless)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard

```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Railway (free tier)

1. Create a project at [railway.app](https://railway.app) and add a Postgres plugin
2. Copy the `DATABASE_URL` from the plugin's **Variables** tab

### Local Postgres

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/feedback
```

The server creates the `screenshots` table automatically on first run.

---

## Props

| Prop | Type | Description |
|---|---|---|
| `projectName` | `string` | Slug identifying this prototype (e.g. `"agenda-v2"`). Becomes the Notion database name. |
| `apiUrl` | `string` | URL of the deployed feedback server. |

---

## Server environment variables

| Variable | Required | Description |
|---|---|---|
| `NOTION_TOKEN` | Yes | Internal integration secret (`secret_...`) |
| `NOTION_PARENT_PAGE_ID` | Yes | ID of the Notion page to create databases under |
| `DATABASE_URL` | No | Postgres connection string — enables screenshot storage |
| `SERVER_URL` | No | Public URL of this server (used to construct screenshot URLs) |
| `CORS_ORIGINS` | No | Allowed origins, comma-separated, or `*` (default) |
| `PORT` | No | Port to listen on (default: `3001`) |

---

## Notion rate limits

The Notion API allows 3 requests/second. The widget syncs comments sequentially with a 350ms gap between calls, staying safely within limits even with a backlog of offline comments.

---

## License

MIT
