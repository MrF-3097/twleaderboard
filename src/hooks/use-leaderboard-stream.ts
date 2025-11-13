'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  externalLeaderboardResponseSchema,
  type ExternalLeaderboardResponse,
  type ExternalAgent,
  type ExternalStats,
} from '@/types/external-api'

const MAX_RECONNECT_DELAY = 5000 // 5 seconds max for faster reconnection on TV

interface UseLeaderboardStreamReturn {
  agents: ExternalAgent[]
  stats: ExternalStats | null
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
  refetch: () => Promise<void>
  isConnected: boolean
}

/**
 * React hook for real-time leaderboard updates using Server-Sent Events
 * Reduces client-side polling and improves performance
 */
export const useLeaderboardStream = (): UseLeaderboardStreamReturn => {
  const [agents, setAgents] = useState<ExternalAgent[]>([])
  const [stats, setStats] = useState<ExternalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectDelayRef = useRef(500) // Start with 500ms delay for faster reconnection
  const isMountedRef = useRef(true)

  /**
   * Connect to SSE stream
   */
  const connect = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    try {
      const eventSource = new EventSource('/api/leaderboard-stream')
      eventSourceRef.current = eventSource

      // Handle connection open
      eventSource.onopen = () => {
        if (isMountedRef.current) {
          setIsConnected(true)
          setError(null)
          reconnectDelayRef.current = 1000 // Reset delay on successful connection
          console.log('[SSE] Connected to leaderboard stream')
        }
      }

      // Handle updates
      eventSource.addEventListener('update', (event) => {
        if (!isMountedRef.current) return

        try {
          const json: unknown = JSON.parse(event.data)
          const parsed = externalLeaderboardResponseSchema.safeParse(json)

          if (!parsed.success) {
            console.error('[SSE] Invalid data format:', parsed.error)
            return
          }

          const data: ExternalLeaderboardResponse = parsed.data

          if (!data.success) {
            setError(data.error || 'API request failed')
            return
          }

          if (!data.data) {
            setError('No data in API response')
            return
          }

          // Immediate state updates - use flushSync for instant updates on TV
          // Batch all updates together for optimal performance
          setAgents(data.data.agents)
          setStats(data.data.stats)
          setLastUpdated(data.meta?.updated_at || new Date().toISOString())
          setError(null)
          setIsLoading(false)
        } catch (err) {
          console.error('[SSE] Error parsing update:', err)
          if (isMountedRef.current) {
            setError('Failed to parse update data')
          }
        }
      })

      // Handle errors
      eventSource.addEventListener('error', (event: any) => {
        if (!isMountedRef.current) return

        const errorData = event.data ? JSON.parse(event.data) : {}
        console.error('[SSE] Stream error:', errorData)

        if (isMountedRef.current) {
          setIsConnected(false)
          setError(errorData.error || 'Connection error')
        }

        // Attempt to reconnect with exponential backoff
        eventSource.close()
        eventSourceRef.current = null

        if (isMountedRef.current) {
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            MAX_RECONNECT_DELAY
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              console.log(`[SSE] Reconnecting in ${reconnectDelayRef.current}ms...`)
              connect()
            }
          }, reconnectDelayRef.current)
        }
      })

      // Handle ping (keepalive)
      eventSource.addEventListener('ping', () => {
        // Just acknowledge - connection is alive
        if (isMountedRef.current) {
          setIsConnected(true)
        }
      })
    } catch (err) {
      console.error('[SSE] Error creating EventSource:', err)
      if (isMountedRef.current) {
        setIsConnected(false)
        setError('Failed to establish connection')
        setIsLoading(false)
      }
    }
  }, [])

  /**
   * Manual refetch - reconnects to stream
   */
  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    reconnectDelayRef.current = 1000 // Reset delay
    connect()
  }, [connect])

  /**
   * Set up connection on mount
   */
  useEffect(() => {
    isMountedRef.current = true
    connect()

    return () => {
      isMountedRef.current = false
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [connect])

  return {
    agents,
    stats,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isConnected,
  }
}

