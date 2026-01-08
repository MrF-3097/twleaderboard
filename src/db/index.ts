import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import * as path from 'path'
import * as fs from 'fs'

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite')
const dbDir = path.dirname(dbPath)

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log(`[DB] Created database directory: ${dbDir}`)
}

const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

// Enable foreign keys
sqlite.pragma('foreign_keys = ON')

