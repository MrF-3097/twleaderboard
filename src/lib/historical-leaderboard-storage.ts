import type { Agent, AgentStats } from '@/types'

/**
 * Historical leaderboard snapshot stored for a specific month
 */
export interface HistoricalLeaderboardSnapshot {
  year: number
  month: number // 1-12
  agents: Agent[]
  stats: AgentStats | null
  timestamp: number // When snapshot was taken
}

/**
 * Available month metadata from server
 */
export interface AvailableMonth {
  year: number
  month: number
  monthKey: string
  metadata?: {
    totalAgents: number
    totalTransactions: number
    totalCommission: number
    topPerformerName: string | null
    topPerformerCommission: number | null
    snapshotTimestamp: string
  }
}

// API base URL - uses proxy to avoid CORS
const getApiUrl = (): string => {
  return '/api/historic-snapshots-proxy'
}

/**
 * Get month name in Romanian
 */
export const getMonthNameRo = (month: number): string => {
  const months = [
    'Ianuarie',
    'Februarie',
    'Martie',
    'Aprilie',
    'Mai',
    'Iunie',
    'Iulie',
    'August',
    'Septembrie',
    'Octombrie',
    'Noiembrie',
    'Decembrie',
  ]
  return months[month - 1] || ''
}

/**
 * Save a leaderboard snapshot for a specific month (to server)
 */
export const saveSnapshotForMonth = async (
  year: number,
  month: number,
  agents: Agent[],
  stats: AgentStats | null
): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year,
        month,
        agents,
        stats,
      }),
    })

    const data = await response.json()

    if (data.success) {
      console.log(`[Historical Leaderboard] Saved snapshot for ${year}-${String(month).padStart(2, '0')} with ${agents.length} agents`)
      return true
    } else {
      console.error('[Historical Leaderboard] Server error:', data.error)
      return false
    }
  } catch (err) {
    console.error('[Historical Leaderboard] Error saving snapshot:', err)
    return false
  }
}

/**
 * Save a leaderboard snapshot for the current month (to server)
 */
export const saveMonthlySnapshot = async (
  agents: Agent[],
  stats: AgentStats | null
): Promise<boolean> => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // JavaScript months are 0-indexed

  return saveSnapshotForMonth(year, month, agents, stats)
}

/**
 * Load a specific month's leaderboard snapshot (from server)
 */
export const loadMonthlySnapshot = async (
  year: number,
  month: number
): Promise<HistoricalLeaderboardSnapshot | null> => {
  try {
    const response = await fetch(`${getApiUrl()}?year=${year}&month=${month}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.success && data.data) {
      return {
        year: data.data.year,
        month: data.data.month,
        agents: data.data.agents || [],
        stats: data.data.stats || null,
        timestamp: data.data.metadata?.snapshotTimestamp 
          ? new Date(data.data.metadata.snapshotTimestamp).getTime() 
          : Date.now(),
      }
    }

    return null
  } catch (err) {
    console.error('[Historical Leaderboard] Error loading monthly snapshot:', err)
    return null
  }
}

/**
 * Get all available months with snapshots (from server), sorted chronologically (newest first)
 */
export const getAvailableMonths = async (): Promise<AvailableMonth[]> => {
  try {
    const response = await fetch(getApiUrl(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.success && data.data?.availableMonths) {
      return data.data.availableMonths as AvailableMonth[]
    }

    return []
  } catch (err) {
    console.error('[Historical Leaderboard] Error fetching available months:', err)
    return []
  }
}

// ============================================================================
// LEGACY SYNCHRONOUS FUNCTIONS (for backwards compatibility during transition)
// These are deprecated and will be removed in future versions
// ============================================================================

const HISTORICAL_STORAGE_KEY = 'historical_leaderboards'

/**
 * @deprecated Use async getAvailableMonths() instead
 * Synchronous version that reads from localStorage (legacy)
 */
export const getAvailableMonthsSync = (): Array<{ year: number; month: number; monthKey: string }> => {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(HISTORICAL_STORAGE_KEY)
    if (!data) return []

    const parsed = JSON.parse(data) as Record<string, HistoricalLeaderboardSnapshot>
    
    return Object.keys(parsed)
      .map((monthKey) => {
        const parts = monthKey.split('-')
        if (parts.length !== 2) return null
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10)
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null
        return { year, month, monthKey }
      })
      .filter((item): item is { year: number; month: number; monthKey: string } => item !== null)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })
  } catch (err) {
    console.error('[Historical Leaderboard] Error loading local snapshots:', err)
    return []
  }
}

/**
 * @deprecated Use async loadMonthlySnapshot() instead
 * Synchronous version that reads from localStorage (legacy)
 */
export const loadMonthlySnapshotSync = (
  year: number,
  month: number
): HistoricalLeaderboardSnapshot | null => {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(HISTORICAL_STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data) as Record<string, HistoricalLeaderboardSnapshot>
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    return parsed[monthKey] || null
  } catch (err) {
    console.error('[Historical Leaderboard] Error loading local snapshot:', err)
    return null
  }
}
