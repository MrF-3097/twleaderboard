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

const HISTORICAL_STORAGE_KEY = 'historical_leaderboards'

/**
 * Get month key for storage (format: "YYYY-MM")
 */
const getMonthKey = (year: number, month: number): string => {
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Parse month key from storage (format: "YYYY-MM")
 */
const parseMonthKey = (key: string): { year: number; month: number } | null => {
  const parts = key.split('-')
  if (parts.length !== 2) return null
  
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null
  
  return { year, month }
}

/**
 * Save a leaderboard snapshot for a specific month
 */
export const saveSnapshotForMonth = (
  year: number,
  month: number,
  agents: Agent[],
  stats: AgentStats | null
): void => {
  if (typeof window === 'undefined') return

  try {
    const snapshot: HistoricalLeaderboardSnapshot = {
      year,
      month,
      agents: [...agents], // Deep copy to avoid reference issues
      stats: stats ? { ...stats } : null,
      timestamp: Date.now(),
    }

    // Load existing historical data
    const existingData = loadAllHistoricalSnapshots()
    
    // Update or add the snapshot for this month
    const monthKey = getMonthKey(year, month)
    existingData[monthKey] = snapshot

    // Save back to localStorage
    localStorage.setItem(HISTORICAL_STORAGE_KEY, JSON.stringify(existingData))
    
    console.log(`[Historical Leaderboard] Saved snapshot for ${monthKey} with ${agents.length} agents`)
  } catch (err) {
    console.error('[Historical Leaderboard] Error saving snapshot:', err)
  }
}

/**
 * Save a leaderboard snapshot for the current month
 */
export const saveMonthlySnapshot = (
  agents: Agent[],
  stats: AgentStats | null
): void => {
  if (typeof window === 'undefined') return

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // JavaScript months are 0-indexed

  saveSnapshotForMonth(year, month, agents, stats)
}

/**
 * Load all historical leaderboard snapshots
 */
export const loadAllHistoricalSnapshots = (): Record<string, HistoricalLeaderboardSnapshot> => {
  if (typeof window === 'undefined') return {}

  try {
    const data = localStorage.getItem(HISTORICAL_STORAGE_KEY)
    if (!data) return {}

    const parsed = JSON.parse(data)
    return parsed as Record<string, HistoricalLeaderboardSnapshot>
  } catch (err) {
    console.error('[Historical Leaderboard] Error loading snapshots:', err)
    return {}
  }
}

/**
 * Load a specific month's leaderboard snapshot
 */
export const loadMonthlySnapshot = (
  year: number,
  month: number
): HistoricalLeaderboardSnapshot | null => {
  if (typeof window === 'undefined') return null

  try {
    const allSnapshots = loadAllHistoricalSnapshots()
    const monthKey = getMonthKey(year, month)
    return allSnapshots[monthKey] || null
  } catch (err) {
    console.error('[Historical Leaderboard] Error loading monthly snapshot:', err)
    return null
  }
}

/**
 * Get all available months with snapshots, sorted chronologically (newest first)
 */
export const getAvailableMonths = (): Array<{ year: number; month: number; monthKey: string }> => {
  const allSnapshots = loadAllHistoricalSnapshots()
  
  return Object.keys(allSnapshots)
    .map((monthKey) => {
      const parsed = parseMonthKey(monthKey)
      if (!parsed) return null
      return { ...parsed, monthKey }
    })
    .filter((item): item is { year: number; month: number; monthKey: string } => item !== null)
    .sort((a, b) => {
      // Sort by year first, then month (newest first)
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
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
 * Clean up snapshots older than specified number of months
 */
export const cleanupOldSnapshots = (keepMonths: number = 12): void => {
  if (typeof window === 'undefined') return

  try {
    const allSnapshots = loadAllHistoricalSnapshots()
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Calculate cutoff date
    let cutoffYear = currentYear
    let cutoffMonth = currentMonth - keepMonths
    
    while (cutoffMonth <= 0) {
      cutoffMonth += 12
      cutoffYear -= 1
    }

    const cutoffKey = getMonthKey(cutoffYear, cutoffMonth)

    // Filter out old snapshots
    const filtered: Record<string, HistoricalLeaderboardSnapshot> = {}
    Object.entries(allSnapshots).forEach(([monthKey, snapshot]) => {
      // Keep if month is after cutoff
      const snapshotKey = getMonthKey(snapshot.year, snapshot.month)
      if (snapshotKey >= cutoffKey) {
        filtered[monthKey] = snapshot
      }
    })

    // Save filtered data
    localStorage.setItem(HISTORICAL_STORAGE_KEY, JSON.stringify(filtered))
    
    const removedCount = Object.keys(allSnapshots).length - Object.keys(filtered).length
    if (removedCount > 0) {
      console.log(`[Historical Leaderboard] Cleaned up ${removedCount} old snapshot(s)`)
    }
  } catch (err) {
    console.error('[Historical Leaderboard] Error cleaning up snapshots:', err)
  }
}

