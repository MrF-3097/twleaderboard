'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  externalLeaderboardResponseSchema,
  type ExternalLeaderboardResponse,
  type ExternalAgent,
  type ExternalStats,
} from '@/types/external-api'

/**
 * Configuration for external leaderboard API
 * Uses Next.js proxy route to avoid CORS issues
 * Can fallback to direct API URL if proxy fails
 */
const getApiUrl = (): string => {
  // Use proxy route first (avoids CORS issues)
  if (typeof window !== 'undefined') {
    return '/api/leaderboard-proxy'
  }
  // Server-side: use direct API URL
  return process.env.NEXT_PUBLIC_LEADERBOARD_API_URL || 'http://185.92.192.127:3002/api/leaderboard'
}

const API_BASE_URL = getApiUrl()
const FALLBACK_API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL || 'http://185.92.192.127:3002/api/leaderboard'
const POLLING_INTERVAL = 5000 // 5 seconds as recommended
const RETRY_ATTEMPTS = 3
const RETRY_BACKOFF_BASE_MS = 1000 // Base delay for exponential backoff
const FETCH_TIMEOUT_MS = 10000 // 10 seconds timeout

/**
 * Fetch with timeout wrapper
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = FETCH_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Fetch with retry logic and exponential backoff
 */
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries: number = RETRY_ATTEMPTS
): Promise<Response> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)
      if (response.ok) {
        return response
      }
      // If not the last attempt, throw to trigger retry
      if (attempt < retries - 1) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    } catch (error) {
      if (attempt === retries - 1) {
        throw error
      }
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * RETRY_BACKOFF_BASE_MS
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

interface UseExternalLeaderboardReturn {
  agents: ExternalAgent[]
  stats: ExternalStats | null
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
  refetch: () => Promise<void>
}

/**
 * React hook for fetching leaderboard data from external API
 * Implements polling, ETag cache validation, and retry logic
 */
export const useExternalLeaderboard = (
  pollingInterval: number = POLLING_INTERVAL
): UseExternalLeaderboardReturn => {
  const [agents, setAgents] = useState<ExternalAgent[]>([])
  const [stats, setStats] = useState<ExternalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  
  const lastETagRef = useRef<string | null>(null)
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  /**
   * Internal fetch function (not memoized to allow recursion)
   */
  const fetchLeaderboardInternal = async (useFallback: boolean = false): Promise<void> => {
    try {
      const url = useFallback ? FALLBACK_API_URL : API_BASE_URL
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // Add ETag header if we have a previous ETag
      if (lastETagRef.current) {
        headers['If-None-Match'] = lastETagRef.current
      }

      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers,
        mode: 'cors', // Explicitly set CORS mode
      })

      // Handle 304 Not Modified (data hasn't changed)
      if (response.status === 304) {
        console.log('[External API] Data not modified (304), using cached data')
        return
      }

      // Update ETag if present
      const etag = response.headers.get('ETag')
      if (etag) {
        lastETagRef.current = etag
      }

      // Parse response
      const json: unknown = await response.json()
      const parsed = externalLeaderboardResponseSchema.safeParse(json)

      if (!parsed.success) {
        throw new Error(`Invalid API response: ${parsed.error.message}`)
      }

      const data: ExternalLeaderboardResponse = parsed.data

      if (!data.success) {
        throw new Error(data.error || 'API request failed')
      }

      if (!data.data) {
        throw new Error('No data in API response')
      }

      // Update state only if component is still mounted
      if (isMountedRef.current) {
        setAgents(data.data.agents)
        setStats(data.data.stats)
        setLastUpdated(data.meta?.updated_at || new Date().toISOString())
        setError(null)
        setIsLoading(false)
      }
    } catch (err) {
      console.error(`[External API] Error fetching leaderboard${useFallback ? ' (fallback)' : ''}:`, err)
      
      // If proxy failed and we haven't tried fallback yet, try direct API
      if (!useFallback && typeof window !== 'undefined' && API_BASE_URL.startsWith('/api/')) {
        console.log('[External API] Proxy failed, trying direct API as fallback...')
        return fetchLeaderboardInternal(true)
      }
      
      if (isMountedRef.current) {
        // Provide more helpful error messages
        let errorMessage = 'Unknown error occurred'
        if (err instanceof TypeError && err.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to leaderboard API. Check your connection or API URL.'
        } else if (err instanceof Error) {
          errorMessage = err.message
        }
        
        setError(errorMessage)
        setIsLoading(false)
        
        // Don't clear existing data on error - show cached data
        // This provides better UX during network issues
      }
    }
  }

  /**
   * Fetch leaderboard data from external API
   * Uses ETag for efficient cache validation
   * Tries proxy route first, falls back to direct API if needed
   */
  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    await fetchLeaderboardInternal(false)
  }, [])

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    // Reset ETag to force fresh fetch
    lastETagRef.current = null
    await fetchLeaderboard(false)
  }, [fetchLeaderboard])

  /**
   * Set up polling interval
   */
  useEffect(() => {
    isMountedRef.current = true
    
    // Initial fetch
    fetchLeaderboard()

    // Set up polling interval
    intervalIdRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchLeaderboard()
      }
    }, pollingInterval)

    // Cleanup
    return () => {
      isMountedRef.current = false
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
    }
  }, [fetchLeaderboard, pollingInterval])

  return {
    agents,
    stats,
    isLoading,
    error,
    lastUpdated,
    refetch,
  }
}

