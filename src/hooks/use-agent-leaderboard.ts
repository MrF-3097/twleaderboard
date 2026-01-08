import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Agent, AgentStats, LeaderboardRankChange } from '@/types'
import { useLeaderboardStream } from './use-leaderboard-stream'
import type { ExternalAgent, ExternalStats } from '@/types/external-api'

const MIN_VISIBLE_AGENTS = 10
const REBS_AGENTS_CACHE_KEY = 'rebs_agents_cache'
const REBS_AGENTS_CACHE_TIMESTAMP_KEY = 'rebs_agents_cache_timestamp'
const REBS_CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours cache
const REBS_FETCH_RETRIES = 3
const REBS_FETCH_RETRY_DELAY_MS = 2000 // 2 seconds between retries

interface UseAgentLeaderboardReturn {
  agents: Agent[]
  stats: AgentStats | null
  isLoading: boolean
  error: string | null
  rankChanges: LeaderboardRankChange[]
  refetch: () => Promise<void>
  simulateChanges: () => void
}

/**
 * REBS Agent interface for avatar enrichment
 */
interface RebsAgent {
  id?: number | string
  name?: string
  first_name?: string
  last_name?: string
  avatar?: string | null
  profile_picture?: string | null
  email?: string
  phone?: string
  position?: string
}

/**
 * Maps ExternalAgent from API to internal Agent type
 * Enriches with REBS CRM data if avatar is missing
 */
const mapExternalAgentToAgent = (
  externalAgent: ExternalAgent,
  findRebsAgent: (name: string, firstName?: string, lastName?: string) => RebsAgent | null
): Agent => {
  // Get avatar from external API first
  let avatar = externalAgent.avatar || externalAgent.profile_picture || undefined
  let profilePicture = externalAgent.profile_picture || externalAgent.avatar || undefined
  let email = externalAgent.email || undefined
  let phone = externalAgent.phone || undefined
  let position = externalAgent.position || undefined

  // If avatar is missing, try to enrich from REBS CRM
  if (!avatar) {
    const rebsAgent = findRebsAgent(
      externalAgent.name,
      externalAgent.first_name || undefined,
      externalAgent.last_name || undefined
    )

    if (rebsAgent) {
      // Use REBS avatar if available
      avatar = rebsAgent.avatar || rebsAgent.profile_picture || undefined
      profilePicture = rebsAgent.profile_picture || rebsAgent.avatar || undefined
      
      // Also enrich other fields if missing
      if (!email && rebsAgent.email) email = rebsAgent.email
      if (!phone && rebsAgent.phone) phone = rebsAgent.phone
      if (!position && rebsAgent.position) position = rebsAgent.position
    }
  }

  return {
    id: externalAgent.id,
    name: externalAgent.name,
    rank: externalAgent.rank,
    email,
    phone,
    avatar,
    profile_picture: profilePicture,
    closed_transactions: externalAgent.closed_transactions,
    total_value: externalAgent.total_value,
    total_commission: externalAgent.total_commission,
    xp: externalAgent.xp,
    level: externalAgent.level,
    active_listings: externalAgent.active_listings || undefined,
    position,
    first_name: externalAgent.first_name || undefined,
    last_name: externalAgent.last_name || undefined,
  }
}

const getRebsFullName = (agent: RebsAgent): string => {
  const name = agent.name?.trim()
  if (name) return name

  const combined = `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim()
  return combined || ''
}

const createFallbackAgentFromRebs = (agent: RebsAgent, fallbackIndex: number): Agent => {
  const baseName = getRebsFullName(agent) || `Agent necunoscut ${fallbackIndex + 1}`
  const normalizedName = baseName.toLowerCase().replace(/\s+/g, '-')
  const id = agent.id ? `rebs-${agent.id}` : `rebs-${normalizedName || fallbackIndex}`

  return {
    id,
    name: baseName,
    avatar: agent.avatar || agent.profile_picture || undefined,
    profile_picture: agent.profile_picture || agent.avatar || undefined,
    email: agent.email || undefined,
    phone: agent.phone || undefined,
    position: agent.position || undefined,
    first_name: agent.first_name || undefined,
    last_name: agent.last_name || undefined,
    rank: undefined,
    closed_transactions: 0,
    total_value: 0,
    total_commission: 0,
    xp: 0,
    level: 1,
  }
}

const createPlaceholderAgent = (index: number): Agent => {
  const placeholderName = `Agent necunoscut ${index}`
  return {
    id: `placeholder-${index}`,
    name: placeholderName,
    rank: undefined,
    closed_transactions: 0,
    total_value: 0,
    total_commission: 0,
    xp: 0,
    level: 1,
  }
}

/**
 * Maps ExternalStats from API to internal AgentStats type
 */
const mapExternalStatsToStats = (
  externalStats: ExternalStats,
  agents: Agent[],
  findRebsAgent: (name: string, firstName?: string, lastName?: string) => RebsAgent | null
): AgentStats => {
  // Calculate total commission from all agents
  const total_commission = agents.reduce(
    (sum, agent) => sum + (agent.total_commission || 0),
    0
  )

  return {
    total_agents: externalStats.total_agents,
    total_transactions: externalStats.total_transactions,
    total_sales_value: externalStats.total_sales_value,
    total_commission,
    top_performer: externalStats.top_performer
      ? mapExternalAgentToAgent(externalStats.top_performer, findRebsAgent)
      : agents.length > 0
      ? agents[0]
      : null,
  }
}

export const useAgentLeaderboard = (
  pollingInterval: number = 5000 // Kept for backward compatibility, but not used with SSE
): UseAgentLeaderboardReturn => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [rankChanges, setRankChanges] = useState<LeaderboardRankChange[]>([])
  const previousAgentsRef = useRef<Agent[]>([])
  const rebsAgentsRef = useRef<RebsAgent[]>([])
  const [rebsAgentsLoaded, setRebsAgentsLoaded] = useState(false)
  
  // Use SSE stream instead of polling for better performance
  const {
    agents: externalAgents,
    stats: externalStats,
    isLoading,
    error,
    refetch: refetchExternal,
  } = useLeaderboardStream()

  /**
   * Load REBS agents from localStorage cache
   */
  const loadRebsAgentsFromCache = useCallback((): RebsAgent[] => {
    if (typeof window === 'undefined') return []
    
    try {
      const cachedData = localStorage.getItem(REBS_AGENTS_CACHE_KEY)
      const cachedTimestamp = localStorage.getItem(REBS_AGENTS_CACHE_TIMESTAMP_KEY)
      
      if (!cachedData || !cachedTimestamp) return []
      
      const timestamp = parseInt(cachedTimestamp, 10)
      const now = Date.now()
      
      // Check if cache is still valid (within 24 hours)
      if (now - timestamp < REBS_CACHE_DURATION_MS) {
        const agents = JSON.parse(cachedData)
        console.log(`[REBS] Loaded ${agents.length} agents from cache (age: ${Math.round((now - timestamp) / 1000 / 60)} minutes)`)
        return agents
      } else {
        console.log('[REBS] Cache expired, will fetch fresh data')
        // Clear expired cache
        localStorage.removeItem(REBS_AGENTS_CACHE_KEY)
        localStorage.removeItem(REBS_AGENTS_CACHE_TIMESTAMP_KEY)
        return []
      }
    } catch (err) {
      console.error('[REBS] Error loading from cache:', err)
      return []
    }
  }, [])

  /**
   * Save REBS agents to localStorage cache
   */
  const saveRebsAgentsToCache = useCallback((agents: RebsAgent[]) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(REBS_AGENTS_CACHE_KEY, JSON.stringify(agents))
      localStorage.setItem(REBS_AGENTS_CACHE_TIMESTAMP_KEY, Date.now().toString())
      console.log(`[REBS] Saved ${agents.length} agents to cache`)
    } catch (err) {
      console.error('[REBS] Error saving to cache:', err)
      // If localStorage is full, try to clear old cache
      try {
        localStorage.removeItem(REBS_AGENTS_CACHE_KEY)
        localStorage.removeItem(REBS_AGENTS_CACHE_TIMESTAMP_KEY)
        localStorage.setItem(REBS_AGENTS_CACHE_KEY, JSON.stringify(agents))
        localStorage.setItem(REBS_AGENTS_CACHE_TIMESTAMP_KEY, Date.now().toString())
        console.log('[REBS] Cleared old cache and saved new data')
      } catch (clearErr) {
        console.error('[REBS] Failed to save to cache even after clearing:', clearErr)
      }
    }
  }, [])

  /**
   * Fetch REBS agents for avatar enrichment with retry logic and caching
   */
  useEffect(() => {
    // Load from cache immediately on mount
    const cachedAgents = loadRebsAgentsFromCache()
    if (cachedAgents.length > 0) {
      rebsAgentsRef.current = cachedAgents
      setRebsAgentsLoaded(true)
      console.log(`[REBS] Using cached agents (${cachedAgents.length} agents)`)
    }

    const fetchRebsAgents = async (retryCount = 0): Promise<void> => {
      try {
        const response = await fetch('/api/rebs-agents')
        const result = await response.json()
        
        if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
          rebsAgentsRef.current = result.data
          saveRebsAgentsToCache(result.data)
          setRebsAgentsLoaded(true)
          console.log(`[REBS] Loaded ${result.data.length} agents for avatar enrichment`)
          return
        } else if (result.success && result.data && Array.isArray(result.data) && result.data.length === 0) {
          // Empty response - might be a temporary issue, but don't overwrite cache with empty data
          console.warn('[REBS] Received empty agent list from API, keeping cache if available')
          if (rebsAgentsRef.current.length === 0) {
            setRebsAgentsLoaded(true)
          }
          return
        }
        
        // If API returned unsuccessful or no data, try retry
        throw new Error('Invalid response from REBS API')
      } catch (err) {
        console.error(`[REBS] Error fetching agents for avatars (attempt ${retryCount + 1}/${REBS_FETCH_RETRIES}):`, err)
        
        // Retry logic
        if (retryCount < REBS_FETCH_RETRIES - 1) {
          console.log(`[REBS] Retrying in ${REBS_FETCH_RETRY_DELAY_MS / 1000} seconds...`)
          setTimeout(() => {
            fetchRebsAgents(retryCount + 1)
          }, REBS_FETCH_RETRY_DELAY_MS)
          return
        }
        
        // All retries failed - if we have cached data, use it, otherwise mark as loaded anyway
        if (rebsAgentsRef.current.length === 0) {
          console.warn('[REBS] All fetch attempts failed and no cache available')
        } else {
          console.log('[REBS] Using cached data after fetch failure')
        }
        setRebsAgentsLoaded(true)
      }
    }

    // Always try to fetch fresh data in background (unless we're already loaded and cache is fresh)
    const cachedTimestamp = typeof window !== 'undefined' ? localStorage.getItem(REBS_AGENTS_CACHE_TIMESTAMP_KEY) : null
    const shouldFetchFresh = !cachedTimestamp || (Date.now() - parseInt(cachedTimestamp, 10)) > (REBS_CACHE_DURATION_MS / 2) // Fetch if cache is older than 12 hours
    
    if (shouldFetchFresh) {
      fetchRebsAgents()
    } else if (cachedAgents.length > 0) {
      // Cache is fresh enough, just mark as loaded
      setRebsAgentsLoaded(true)
    } else {
      // No cache and should fetch
      fetchRebsAgents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  /**
   * Match REBS agent with leaderboard agent by name
   */
  const findRebsAgent = useCallback((agentName: string, firstName?: string, lastName?: string): RebsAgent | null => {
    const rebsAgents = rebsAgentsRef.current
    
    // Try exact name match first
    let matched = rebsAgents.find(ra => {
      const rebsName = ra.name?.toLowerCase().trim()
      const leaderboardName = agentName.toLowerCase().trim()
      return rebsName === leaderboardName
    })

    // Try matching by first_name and last_name
    if (!matched && firstName && lastName) {
      matched = rebsAgents.find(ra => {
        const rebsFirst = ra.first_name?.toLowerCase().trim()
        const rebsLast = ra.last_name?.toLowerCase().trim()
        return rebsFirst === firstName.toLowerCase().trim() && 
               rebsLast === lastName.toLowerCase().trim()
      })
    }

    // Try partial name match (first name only)
    if (!matched && firstName) {
      matched = rebsAgents.find(ra => {
        const rebsFirst = ra.first_name?.toLowerCase().trim()
        const rebsName = ra.name?.toLowerCase().trim()
        return rebsFirst === firstName.toLowerCase().trim() ||
               (rebsName && rebsName.startsWith(firstName.toLowerCase().trim()))
      })
    }

    return matched || null
  }, [])

  /**
   * Detect rank changes between old and new agent lists
   */
  const detectRankChanges = useCallback((
    oldAgents: Agent[],
    newAgents: Agent[]
  ): LeaderboardRankChange[] => {
    const changes: LeaderboardRankChange[] = []

    newAgents.forEach((newAgent) => {
      const oldAgent = oldAgents.find((a) => a.id === newAgent.id)
      if (oldAgent && oldAgent.rank && newAgent.rank) {
        if (oldAgent.rank > newAgent.rank) {
          changes.push({
            agentId: newAgent.id,
            oldRank: oldAgent.rank,
            newRank: newAgent.rank,
            type: 'up',
          })
        } else if (oldAgent.rank < newAgent.rank) {
          changes.push({
            agentId: newAgent.id,
            oldRank: oldAgent.rank,
            newRank: newAgent.rank,
            type: 'down',
          })
        }
      }
    })

    return changes
  }, [])

  /**
   * Memoize mapped agents to prevent unnecessary recalculations
   * Only remap when external agents or REBS agents change
   */
  const mappedAgents = useMemo(() => {
    if (externalAgents.length === 0) return []
    return externalAgents.map(agent => 
      mapExternalAgentToAgent(agent, findRebsAgent)
    )
  }, [externalAgents, findRebsAgent])

  /**
   * Process external API data and update state
   * Enriches with REBS CRM avatars when available
   * Optimized for instant updates on TV
   */
  useEffect(() => {
    const actualAgentsSorted = [...mappedAgents].sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER
      if (rankA === rankB) {
        return (a.name ?? '').localeCompare(b.name ?? '')
      }
      return rankA - rankB
    })

    const existingNameSet = new Set(
      actualAgentsSorted
        .map(agent => agent.name?.toLowerCase().trim())
        .filter((name): name is string => Boolean(name))
    )

    const fallbackAgents: Agent[] = []
    
    // If API returns 0 agents and we have REBS agents, use ALL REBS agents
    // Otherwise, only fill up to MIN_VISIBLE_AGENTS if needed
    const shouldUseAllRebsAgents = actualAgentsSorted.length === 0 && 
                                     (rebsAgentsLoaded || rebsAgentsRef.current.length > 0) &&
                                     rebsAgentsRef.current.length > 0
    
    if (shouldUseAllRebsAgents) {
      // Use ALL REBS agents when API returns 0 agents
      const rebsFallback = rebsAgentsRef.current
        .filter(rebsAgent => {
          const name = getRebsFullName(rebsAgent).toLowerCase().trim()
          if (!name) return false
          return !existingNameSet.has(name)
        })
        .sort((a, b) => getRebsFullName(a).localeCompare(getRebsFullName(b)))
        .map((agent, index) => createFallbackAgentFromRebs(agent, index))
      
      fallbackAgents.push(...rebsFallback)
      console.log(`[Agent Leaderboard] Using all ${rebsFallback.length} REBS agents as fallback (API returned 0 agents)`)
    } else if (actualAgentsSorted.length < MIN_VISIBLE_AGENTS && (rebsAgentsLoaded || rebsAgentsRef.current.length > 0)) {
      // Only create fallback agents if we have REBS data loaded, or if we're still loading and have cached data
      // This prevents creating "Agent necunoscut" placeholders when REBS data is still loading
      const needed = MIN_VISIBLE_AGENTS - actualAgentsSorted.length

      // Only use REBS agents for fallback if we have them loaded
      if (rebsAgentsRef.current.length > 0) {
        const rebsFallback = rebsAgentsRef.current
          .filter(rebsAgent => {
            const name = getRebsFullName(rebsAgent).toLowerCase().trim()
            if (!name) return false
            return !existingNameSet.has(name)
          })
          .sort((a, b) => getRebsFullName(a).localeCompare(getRebsFullName(b)))
          .map((agent, index) => createFallbackAgentFromRebs(agent, index))

        for (const fallback of rebsFallback) {
          fallbackAgents.push(fallback)
          if (fallbackAgents.length >= needed) break
        }
      }

      // Only create placeholder agents if we absolutely can't fill with REBS agents
      // This should rarely happen if REBS data is properly loaded
      let placeholderIndex = 1
      while (fallbackAgents.length < needed) {
        fallbackAgents.push(
          createPlaceholderAgent(actualAgentsSorted.length + placeholderIndex)
        )
        placeholderIndex += 1
      }
    }

    const combinedAgents = [...actualAgentsSorted, ...fallbackAgents].map((agent, index) => ({
      ...agent,
      rank: index + 1,
    }))

    if (previousAgentsRef.current.length > 0) {
      const changes = detectRankChanges(previousAgentsRef.current, combinedAgents)
      if (changes.length > 0) {
        setRankChanges(changes)
        setTimeout(() => setRankChanges([]), 3000)
      }
    }

    previousAgentsRef.current = combinedAgents
    console.log(`[Agent Leaderboard] Setting ${combinedAgents.length} total agents (${actualAgentsSorted.length} from API + ${fallbackAgents.length} fallback)`)
    setAgents(combinedAgents)

    if (externalStats) {
      setStats(mapExternalStatsToStats(externalStats, combinedAgents, findRebsAgent))
    } else if (!isLoading && combinedAgents.length === 0) {
      setStats(null)
    }
  }, [mappedAgents, externalStats, isLoading, detectRankChanges, findRebsAgent, rebsAgentsLoaded])

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async (): Promise<void> => {
    await refetchExternal()
  }, [refetchExternal])

  /**
   * Simulate rank changes for testing
   * Note: This modifies local state only and doesn't affect the API
   */
  const simulateChanges = useCallback(() => {
    if (agents.length === 0) return

    // Create a shuffled copy of agents with modified commission values
    const shuffled = [...agents]
      .map(agent => {
        // Randomly adjust commission by ±1000
        const adjustedCommission = Math.max(0, (agent.xp || 0) + Math.floor(Math.random() * 2001) - 1000)
        return {
          ...agent,
          xp: adjustedCommission,
          level: Math.floor(adjustedCommission / 1000) + 1,
          // Adjust closed_transactions and total_value proportionally for display
          closed_transactions: Math.max(0, (agent.closed_transactions || 0) + Math.floor(Math.random() * 11) - 5),
          total_value: Math.max(0, (agent.total_value || 0) + Math.floor(Math.random() * 20001) - 10000)
        }
      })
      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
      .map((agent, index) => ({
        ...agent,
        rank: index + 1
      }))

    // Detect rank changes
    const changes = detectRankChanges(agents, shuffled)
    if (changes.length > 0) {
      setRankChanges(changes)
      setTimeout(() => setRankChanges([]), 5000)
    }

    // Update state with simulated data
    previousAgentsRef.current = shuffled
    setAgents(shuffled)
    
    // Recalculate stats
    const totalTransactions = shuffled.reduce(
      (sum, agent) => sum + (agent.closed_transactions || 0),
      0
    )
    const totalSalesValue = shuffled.reduce(
      (sum, agent) => sum + (agent.total_value || 0),
      0
    )
    const totalCommission = shuffled.reduce(
      (sum, agent) => sum + (agent.total_commission || 0),
      0
    )
    setStats({
      total_agents: shuffled.length,
      total_transactions: totalTransactions,
      total_sales_value: totalSalesValue,
      total_commission: totalCommission,
      top_performer: shuffled.length > 0 ? shuffled[0] : null,
    })
  }, [agents, detectRankChanges])

  return {
    agents,
    stats,
    isLoading,
    error,
    rankChanges,
    refetch,
    simulateChanges,
  }
}

