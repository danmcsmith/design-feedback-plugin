import { Client } from '@notionhq/client'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: '2022-06-28',
})

const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID!

export async function provisionDatabase(projectName: string): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    title: [{ type: 'text', text: { content: `${projectName} Feedback` } }],
    properties: {
      Comment: { title: {} },
      'Full Text': { rich_text: {} },
      Author: { rich_text: {} },
      'Page URL': { url: {} },
      'Position X': { number: { format: 'percent' } },
      'Position Y': { number: { format: 'percent' } },
      Date: { date: {} },
      Status: {
        select: {
          options: [
            { name: 'New', color: 'blue' },
            { name: 'In Review', color: 'yellow' },
            { name: 'Resolved', color: 'green' },
          ],
        },
      },
      Screenshot: { url: {} },
    },
  })

  return db.id
}

export interface SyncCommentParams {
  text: string
  authorName: string
  x: number
  y: number
  pageUrl: string
  timestamp: string
  screenshotPublicUrl?: string
  notionDatabaseId: string
}

export async function syncComment(params: SyncCommentParams): Promise<string> {
  const { text, authorName, x, y, pageUrl, timestamp, screenshotPublicUrl, notionDatabaseId } = params

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
      Author: {
        rich_text: [{ text: { content: authorName } }],
      },
      'Page URL': {
        url: pageUrl,
      },
      'Position X': {
        number: x / 100,
      },
      'Position Y': {
        number: y / 100,
      },
      Date: {
        date: { start: timestamp },
      },
      Status: {
        select: { name: 'New' },
      },
      Screenshot: {
        url: screenshotPublicUrl ?? null,
      },
    },
  })

  return page.id
}
