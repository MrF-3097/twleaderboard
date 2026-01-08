import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-Sent Events endpoint for real-time leaderboard updates
 * Polls external API server-side and pushes updates to connected clients
 * This reduces client-side polling and improves performance
 */
// Use proxy route first, fallback to direct API
const PROXY_API_URL = '/api/leaderboard-proxy'
const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL || 'http://185.92.192.127:3001/api/leaderboard'
const POLLING_INTERVAL = 1000 // Poll every 1 second for instant updates
const MAX_RECONNECT_DELAY = 30000 // Max 30 seconds between reconnects

export async function GET(request: NextRequest) {
  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let lastETag: string | null = null
      let lastData: string | null = null
      let pollInterval: NodeJS.Timeout | null = null
      let isActive = true
      let keepAliveInterval: NodeJS.Timeout | null = null
      const origin = request.nextUrl.origin
      let consecutiveErrors = 0
      let lastErrorLogTime = 0
      const ERROR_LOG_INTERVAL_MS = 30000 // Log errors at most once per 30 seconds

      // Send initial connection message
      const sendMessage = (data: string, event: string = 'message') => {
        if (!isActive) return
        try {
          const message = `event: ${event}\ndata: ${data}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error('[SSE] Error sending message:', error)
          isActive = false
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval)
            keepAliveInterval = null
          }
          try {
            controller.close()
          } catch {
            // ignore
          }
        }
      }

      // Send keepalive ping every 15 seconds (more frequent for TV)
      keepAliveInterval = setInterval(() => {
        if (isActive) {
          sendMessage('ping', 'ping')
        }
      }, 15000)

      // Fetch leaderboard data with improved error handling
      const fetchLeaderboard = async () => {
        if (!isActive) return

        try {
          const headers: HeadersInit = {}

          if (lastETag) {
            headers['If-None-Match'] = lastETag
          }

          // Add timeout to prevent hanging
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 12000) // 12 second timeout (increased to match proxy)

          let response: Response
          try {
            const proxyUrl = new URL(PROXY_API_URL, origin).toString()
            response = await fetch(proxyUrl, {
              method: 'GET',
              headers,
              cache: 'no-store',
              signal: controller.signal,
            })
            clearTimeout(timeoutId)
          } catch (fetchError) {
            clearTimeout(timeoutId)
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              console.error('[SSE] Request timeout (proxy)')
              return // Skip this poll
            }
            console.warn('[SSE] Proxy fetch failed, falling back to external API:', fetchError)

            const fallbackController = new AbortController()
            const fallbackTimeout = setTimeout(() => fallbackController.abort(), 8000)
            try {
              response = await fetch(EXTERNAL_API_URL, {
                method: 'GET',
                headers,
                cache: 'no-store',
                signal: fallbackController.signal,
              })
              clearTimeout(fallbackTimeout)
            } catch (fallbackError) {
              clearTimeout(fallbackTimeout)
              if (fallbackError instanceof Error && fallbackError.name === 'AbortError') {
                console.error('[SSE] Request timeout (fallback)')
                return
              }
              throw fallbackError
            }
          }

          // Handle non-OK responses
          if (!response.ok) {
            consecutiveErrors++
            // If we have cached data, don't overwrite it with error
            if (lastData) {
              // Only log occasionally when using cached data
              if (consecutiveErrors % 30 === 0) {
                console.warn(`[SSE] API returned ${response.status}, using cached data (${consecutiveErrors} consecutive errors)`)
              }
              return
            }
            
            // Throttle error logging to reduce spam
            const now = Date.now()
            const shouldLog = now - lastErrorLogTime > ERROR_LOG_INTERVAL_MS || consecutiveErrors === 1
            if (shouldLog) {
              const errorText = await response.text().catch(() => 'Unknown error')
              console.error(`[SSE] API error ${response.status} (${consecutiveErrors} consecutive errors):`, errorText.substring(0, 200))
              if (response.status === 404) {
                console.error(`[SSE] ⚠️  Endpoint not found. Check if API URL is correct: ${EXTERNAL_API_URL}`)
                console.error(`[SSE] Set NEXT_PUBLIC_LEADERBOARD_API_URL environment variable if path is different`)
              }
              lastErrorLogTime = now
            }
            
            sendMessage(
              JSON.stringify({
                error: `API returned ${response.status}: ${response.statusText}`,
              }),
              'error'
            )
            return
          }
          
          // Reset error counter on success
          consecutiveErrors = 0

          // Handle 304 Not Modified
          if (response.status === 304) {
            // Data hasn't changed, don't send update
            return
          }

          // Update ETag
          const etag = response.headers.get('ETag')
          if (etag) {
            lastETag = etag
          }

          // Check content type before parsing
          const contentType = response.headers.get('content-type') || ''
          if (!contentType.includes('application/json')) {
            const text = await response.text()
            console.error('[SSE] Non-JSON response received:', text.substring(0, 300))
            
            // If we have cached data, keep using it instead of erroring
            if (lastData) {
              console.warn('[SSE] Using cached data due to invalid response format')
              return
            }
            
            sendMessage(
              JSON.stringify({
                error: `Expected JSON but received ${contentType}`,
                details: text.substring(0, 100),
              }),
              'error'
            )
            return
          }

          // Parse response
          let json: unknown
          try {
            json = await response.json()
          } catch (parseError) {
            console.error('[SSE] JSON parse error:', parseError)
            // If we have cached data, keep using it
            if (lastData) {
              console.warn('[SSE] Using cached data due to parse error')
              return
            }
            sendMessage(
              JSON.stringify({
                error: 'Failed to parse JSON response',
              }),
              'error'
            )
            return
          }

          const dataString = JSON.stringify(json)

          // Only send update if data actually changed
          if (dataString !== lastData) {
            lastData = dataString
            sendMessage(dataString, 'update')
          }
        } catch (error) {
          console.error('[SSE] Error fetching leaderboard:', error)
          
          // If we have cached data, don't overwrite it with error
          if (lastData && error instanceof Error && error.message.includes('fetch')) {
            console.warn('[SSE] Network error, using cached data')
            return
          }
          
          sendMessage(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Failed to fetch leaderboard',
            }),
            'error'
          )
        }
      }

      // Initial fetch
      await fetchLeaderboard()

      // Set up polling interval
      pollInterval = setInterval(() => {
        if (isActive) {
          fetchLeaderboard()
        }
      }, POLLING_INTERVAL)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isActive = false
        if (pollInterval) {
          clearInterval(pollInterval)
        }
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval)
          keepAliveInterval = null
        }
        try {
          controller.close()
        } catch {
          // ignore
        }
      })
    },
  })

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    },
  })
}

