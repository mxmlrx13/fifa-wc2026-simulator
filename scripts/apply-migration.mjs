#!/usr/bin/env node
/**
 * Apply SQL migration files to the Supabase database.
 *
 * Usage: node scripts/apply-migration.mjs <migration-file> [--dry-run]
 *
 * Requires SUPABASE_DB_URL in .env.local (postgresql:// connection string).
 * Wraps the migration in a transaction. Statements that cannot run inside
 * a transaction (e.g. ALTER PUBLICATION) are extracted and run separately.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'

const { Client } = pg

// Load .env.local manually (no dotenv dependency)
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
  } catch {
    // ignore
  }
}

loadEnv()

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('ERROR: SUPABASE_DB_URL not found in .env.local')
  process.exit(1)
}

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.mjs <migration-file>')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const sql = readFileSync(resolve(process.cwd(), migrationFile), 'utf-8')

// Split out ALTER PUBLICATION statements (can't run in transaction on some setups)
const lines = sql.split('\n')
const publicationStatements = []
const transactionStatements = []

let currentStmt = ''
for (const line of lines) {
  const trimmed = line.trim()
  if (trimmed.startsWith('--') || trimmed === '') {
    currentStmt += line + '\n'
    continue
  }
  currentStmt += line + '\n'
  if (trimmed.endsWith(';')) {
    if (currentStmt.toUpperCase().includes('ALTER PUBLICATION')) {
      publicationStatements.push(currentStmt.trim())
    } else {
      transactionStatements.push(currentStmt.trim())
    }
    currentStmt = ''
  }
}

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log(`Connected. Applying ${migrationFile}${dryRun ? ' (DRY RUN)' : ''}...\n`)

  if (dryRun) {
    console.log('--- Transaction statements ---')
    for (const stmt of transactionStatements) console.log(stmt + '\n')
    console.log('--- Publication statements (outside transaction) ---')
    for (const stmt of publicationStatements) console.log(stmt + '\n')
  } else {
    // Run transaction statements
    if (transactionStatements.length > 0) {
      const txSql = transactionStatements
        .filter((s) => !s.startsWith('--'))
        .join('\n')
      await client.query('BEGIN')
      try {
        await client.query(txSql)
        await client.query('COMMIT')
        console.log(`Transaction committed (${transactionStatements.length} statement groups).`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error('Transaction rolled back:', err.message)
        process.exit(1)
      }
    }

    // Run publication statements outside transaction
    for (const stmt of publicationStatements) {
      try {
        await client.query(stmt)
        console.log(`Publication statement OK: ${stmt.slice(0, 60)}...`)
      } catch (err) {
        if (err.message.includes('already member')) {
          console.log(`Skipped (already member): ${stmt.slice(0, 60)}...`)
        } else {
          console.error(`Publication statement failed: ${err.message}`)
        }
      }
    }
  }

  console.log(`\nDone: ${migrationFile}`)
} catch (err) {
  console.error('Connection error:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
