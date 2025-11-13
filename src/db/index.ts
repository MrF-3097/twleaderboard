import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import * as path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite')
const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

// Enable foreign keys
sqlite.pragma('foreign_keys = ON')

