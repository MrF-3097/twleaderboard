import { z } from 'zod'

export const transactionSchema = z.object({
  Agent: z.string(),
  'Valoare Tranzactie': z.union([z.number(), z.string()]).transform((v) => {
    if (typeof v === 'number') return v
    const cleaned = v.replace(/[^0-9.,-]/g, '').replace(/,/g, '.')
    const num = Number(cleaned)
    return Number.isFinite(num) ? num : 0
  }),
  'Tip Tranzactie': z.enum(['Inchiriere', 'Vanzare']),
  'Comision %': z.union([z.number(), z.string()]).transform((v) => {
    if (typeof v === 'number') return v
    const trimmed = v.trim()
    if (trimmed.endsWith('%')) {
      const n = Number(trimmed.slice(0, -1).replace(/,/g, '.'))
      return Number.isFinite(n) ? n / 100 : 0
    }
    const n = Number(trimmed.replace(/,/g, '.'))
    if (!Number.isFinite(n)) return 0
    return n > 1 ? n / 100 : n
  }),
  Comision: z.union([z.number(), z.string()]).transform((v) => {
    if (typeof v === 'number') return v
    const cleaned = v.replace(/[^0-9.,-]/g, '').replace(/,/g, '.')
    const num = Number(cleaned)
    return Number.isFinite(num) ? num : 0
  }),
  Timestamp: z.string(),
})

export type Transaction = z.infer<typeof transactionSchema>

export const leaderboardRowSchema = z.object({
  Rank: z.number(),
  Agent: z.string(),
  NrTranzactii: z.number(),
  SumaValoare: z.number(),
  SumaComision: z.number(),
})

export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>

export const transactionsResponseSchema = z.object({
  updatedAt: z.string(),
  count: z.number(),
  rows: z.array(transactionSchema),
})

export const leaderboardResponseSchema = z.object({
  updatedAt: z.string(),
  count: z.number(),
  rows: z.array(leaderboardRowSchema),
})

export type TransactionsResponse = z.infer<typeof transactionsResponseSchema>
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>

