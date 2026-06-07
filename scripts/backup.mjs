#!/usr/bin/env node
/**
 * Backup all game data from Supabase to timestamped JSON files.
 *
 * Usage: node scripts/backup.mjs
 * Requires: SUPABASE_DB_URL in .env.local
 *
 * Output: backups/<timestamp>/ with one JSON file per table.
 *
 * Tables backed up:
 *   games, players, predictions, official_results, scores,
 *   game_rounds, leaderboard_snapshots
 *
 * RESTORE GUIDANCE:
 *   To restore from a backup, use psql or a script to INSERT the JSON
 *   rows back into the corresponding tables. Order matters due to FKs:
 *     1. games
 *     2. players
 *     3. game_rounds
 *     4. predictions
 *     5. official_results
 *     6. scores
 *     7. leaderboard_snapshots
 *
 *   Example with psql + jq:
 *     cat backups/<ts>/games.json | jq -c '.[]' | while read row; do
 *       echo "INSERT INTO games SELECT * FROM json_populate_record(null::games, '$row');"
 *     done | psql "$SUPABASE_DB_URL"
 *
 *   Or write a small Node script that reads each JSON file and uses
 *   pg client.query with parameterized inserts.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
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
if (!dbUrl) {
  console.error('ERROR: SUPABASE_DB_URL not found in .env.local')
  process.exit(1)
}

const tables = [
  'games',
  'players',
  'game_rounds',
  'predictions',
  'official_results',
  'scores',
  'leaderboard_snapshots',
]

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const backupDir = resolve(process.cwd(), 'backups', timestamp)

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  mkdirSync(backupDir, { recursive: true })

  console.log(`Backing up to ${backupDir}/\n`)

  let totalRows = 0
  for (const table of tables) {
    const { rows } = await client.query(`SELECT * FROM ${table}`)
    const filePath = join(backupDir, `${table}.json`)
    writeFileSync(filePath, JSON.stringify(rows, null, 2))
    console.log(`  ${table}: ${rows.length} rows`)
    totalRows += rows.length
  }

  console.log(`\nBackup complete: ${totalRows} total rows across ${tables.length} tables`)
  console.log(`Files: ${backupDir}/`)

} catch (err) {
  console.error('Backup failed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
