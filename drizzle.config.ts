// @ts-nocheck - Drizzle config file, type checking skipped
const config = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './data/database.sqlite',
  },
}

export default config

