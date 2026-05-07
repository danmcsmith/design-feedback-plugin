import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
})

export async function initDb(): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS screenshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  )
}

export async function saveScreenshot(dataUrl: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    'INSERT INTO screenshots (data) VALUES ($1) RETURNING id',
    [dataUrl],
  )
  return result.rows[0].id
}

export async function getScreenshot(id: string): Promise<string | null> {
  const result = await pool.query<{ data: string }>(
    'SELECT data FROM screenshots WHERE id = $1',
    [id],
  )
  return result.rows[0]?.data ?? null
}
