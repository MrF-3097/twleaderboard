import { z } from 'zod'

/**
 * Zod schemas for external leaderboard API response structure
 * Based on API documentation provided
 */

export const externalAgentSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  rank: z.number(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  profile_picture: z.string().nullable().optional(),
  closed_transactions: z.number(),
  total_value: z.number(),
  total_commission: z.number(),
  xp: z.number(),
  level: z.number(),
  active_listings: z.number().nullable().optional(),
  position: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
})

export type ExternalAgent = z.infer<typeof externalAgentSchema>

export const externalStatsSchema = z.object({
  total_agents: z.number(),
  total_transactions: z.number(),
  total_sales_value: z.number(),
  total_commission: z.number(),
  top_performer: externalAgentSchema.nullable().optional(),
  updated_at: z.string(),
})

export type ExternalStats = z.infer<typeof externalStatsSchema>

export const externalLeaderboardDataSchema = z.object({
  agents: z.array(externalAgentSchema),
  stats: externalStatsSchema,
})

export type ExternalLeaderboardData = z.infer<typeof externalLeaderboardDataSchema>

export const externalLeaderboardResponseSchema = z.object({
  success: z.boolean(),
  data: externalLeaderboardDataSchema.optional(),
  meta: z.object({
    count: z.number(),
    updated_at: z.string(),
  }).optional(),
  error: z.string().optional(),
})

export type ExternalLeaderboardResponse = z.infer<typeof externalLeaderboardResponseSchema>

