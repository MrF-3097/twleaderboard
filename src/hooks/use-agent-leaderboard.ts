import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Agent, AgentStats, LeaderboardRankChange } from '@/types'
import { useLeaderboardStream } from './use-leaderboard-stream'
import type { ExternalAgent, ExternalStats } from '@/types/external-api'

const MIN_VISIBLE_AGENTS = 10

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
   * Fetch REBS agents for avatar enrichment
   */
  useEffect(() => {
    const fetchRebsAgents = async () => {
      try {
        const response = await fetch('/api/rebs-agents')
        const result = await response.json()
        
        if (result.success && result.data && Array.isArray(result.data)) {
          rebsAgentsRef.current = result.data
          setRebsAgentsLoaded(true)
          console.log(`[REBS] Loaded ${result.data.length} agents for avatar enrichment`)
        }
      } catch (err) {
        console.error('[REBS] Error fetching agents for avatars:', err)
        // Don't fail the whole app if REBS fetch fails
        setRebsAgentsLoaded(true)
      }
    }

    // Fetch REBS agents once on mount
    if (!rebsAgentsLoaded) {
      fetchRebsAgents()
    }
  }, [rebsAgentsLoaded])

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
    if (actualAgentsSorted.length < MIN_VISIBLE_AGENTS) {
      const needed = MIN_VISIBLE_AGENTS - actualAgentsSorted.length

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
    setAgents(combinedAgents)

    if (externalStats) {
      setStats(mapExternalStatsToStats(externalStats, combinedAgents, findRebsAgent))
    } else if (!isLoading && combinedAgents.length === 0) {
      setStats(null)
    }
  }, [mappedAgents, externalStats, isLoading, detectRankChanges, findRebsAgent])

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

