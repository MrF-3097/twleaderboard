import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agent: text('agent').notNull(),
  valoareTranzactie: real('valoare_tranzactie').notNull(),
  tipTranzactie: text('tip_tranzactie').notNull(), // 'Vanzare' | 'Inchiriere'
  comisionPct: real('comision_pct').notNull(),
  comision: real('comision').notNull(),
  timestamp: text('timestamp').notNull(), // ISO string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

