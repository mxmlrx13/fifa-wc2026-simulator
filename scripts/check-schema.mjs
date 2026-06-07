#!/usr/bin/env node
import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'
const { Client } = pg

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      const val = trimmed.slice(eqIdx + 1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* ignore */ }
}

loadEnv()
const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) { console.error('No SUPABASE_DB_URL'); process.exit(1) }

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
try {
  await client.connect()

  const { rows: tables } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  )
  console.log('Public tables:', tables.map(r => r.table_name).join(', '))

  for (const tbl of ['games', 'players', 'game_rounds', 'predictions', 'official_results', 'scores', 'leaderboard_snapshots']) {
    const { rows: cols } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position",
      [tbl]
    )
    if (cols.length > 0) {
      console.log(`\n${tbl}:`, cols.map(c => `${c.column_name} (${c.data_type})`).join(', '))
    } else {
      console.log(`\n${tbl}: TABLE NOT FOUND`)
    }
  }
} finally {
  await client.end()
}
