import { useEffect, useRef } from 'react'
import type { Agent, AgentStats } from '@/types'
import { saveMonthlySnapshot } from '@/lib/historical-leaderboard-storage'

interface UseHistoricalLeaderboardOptions {
  /**
   * Enable automatic monthly snapshot saving (default: true)
   */
  autoSave?: boolean
  
  /**
   * Interval in milliseconds to check and save snapshots (default: 1 hour)
   */
  saveInterval?: number
}

/**
 * Hook to automatically save monthly leaderboard snapshots
 * Saves a snapshot at the end of each month or periodically
 */
export const useHistoricalLeaderboard = (
  agents: Agent[],
  stats: AgentStats | null,
  options: UseHistoricalLeaderboardOptions = {}
): void => {
  const { autoSave = true, saveInterval = 60 * 60 * 1000 } = options // Default: 1 hour
  const lastSavedMonthRef = useRef<string | null>(null)
  const agentsRef = useRef<Agent[]>([])
  const statsRef = useRef<AgentStats | null>(null)

  // Keep refs updated
  useEffect(() => {
    agentsRef.current = agents
    statsRef.current = stats
  }, [agents, stats])

  // Save snapshot when agents/stats change
  useEffect(() => {
    if (!autoSave) return
    if (typeof window === 'undefined') return
    if (agents.length === 0) return

    const getCurrentMonthKey = (): string => {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}`
    }

    const currentMonthKey = getCurrentMonthKey()
    
    // Save snapshot if we have agents and it's a different month than last saved
    if (lastSavedMonthRef.current !== currentMonthKey) {
      saveMonthlySnapshot(agents, stats)
      lastSavedMonthRef.current = currentMonthKey
      console.log(`[Historical Leaderboard] Auto-saved snapshot for ${currentMonthKey}`)
    }
  }, [agents, stats, autoSave])

  // Set up interval to periodically check and save
  useEffect(() => {
    if (!autoSave) return
    if (typeof window === 'undefined') return

    const getCurrentMonthKey = (): string => {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}`
    }

    const saveSnapshot = () => {
      const currentMonthKey = getCurrentMonthKey()
      
      // Save snapshot if we have agents and it's a different month than last saved
      if (
        agentsRef.current.length > 0 &&
        lastSavedMonthRef.current !== currentMonthKey
      ) {
        saveMonthlySnapshot(agentsRef.current, statsRef.current)
        lastSavedMonthRef.current = currentMonthKey
        console.log(`[Historical Leaderboard] Auto-saved snapshot for ${currentMonthKey}`)
      }
    }

    // Set up interval to periodically check and save
    const intervalId = setInterval(saveSnapshot, saveInterval)

    // Also save when the month changes (check every minute)
    const monthCheckInterval = setInterval(() => {
      const currentMonthKey = getCurrentMonthKey()
      if (lastSavedMonthRef.current !== currentMonthKey) {
        saveSnapshot()
      }
    }, 60 * 1000) // Check every minute

    return () => {
      clearInterval(intervalId)
      clearInterval(monthCheckInterval)
    }
  }, [autoSave, saveInterval])
}

