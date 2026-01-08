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
 * Hook to automatically save monthly leaderboard snapshots to the server
 * Saves a snapshot periodically to ensure data is backed up
 * 
 * Note: The dashboard API also auto-saves previous month snapshots,
 * so this is mainly for keeping the current month's data up-to-date.
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
  const isSavingRef = useRef(false)

  // Keep refs updated
  useEffect(() => {
    agentsRef.current = agents
    statsRef.current = stats
  }, [agents, stats])

  // Save snapshot when agents/stats change significantly
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
    if (lastSavedMonthRef.current !== currentMonthKey && !isSavingRef.current) {
      isSavingRef.current = true
      saveMonthlySnapshot(agents, stats)
        .then(() => {
          lastSavedMonthRef.current = currentMonthKey
          console.log(`[Historical Leaderboard] Auto-saved snapshot for ${currentMonthKey}`)
        })
        .catch((err) => {
          console.error('[Historical Leaderboard] Error auto-saving:', err)
        })
        .finally(() => {
          isSavingRef.current = false
        })
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

    const saveSnapshot = async () => {
      const currentMonthKey = getCurrentMonthKey()
      
      // Save snapshot if we have agents and not currently saving
      if (agentsRef.current.length > 0 && !isSavingRef.current) {
        isSavingRef.current = true
        try {
          await saveMonthlySnapshot(agentsRef.current, statsRef.current)
          lastSavedMonthRef.current = currentMonthKey
          console.log(`[Historical Leaderboard] Periodic save for ${currentMonthKey}`)
        } catch (err) {
          console.error('[Historical Leaderboard] Error in periodic save:', err)
        } finally {
          isSavingRef.current = false
        }
      }
    }

    // Set up interval to periodically save
    const intervalId = setInterval(saveSnapshot, saveInterval)

    // Also check when the month changes (every minute)
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
