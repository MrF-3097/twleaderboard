// @ts-nocheck - Drizzle config file, type checking skipped
import type { Config } from 'drizzle-kit'

const config = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/database.sqlite',
  },
} satisfies Config

export default config

