import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-Sent Events endpoint for real-time leaderboard updates
 * Polls external API server-side and pushes updates to connected clients
 * This reduces client-side polling and improves performance
 */
const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL || 'http://185.92.192.127:3002/api/leaderboard'
const POLLING_INTERVAL = 5000 // Poll every 5 seconds server-side
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

      // Send initial connection message
      const sendMessage = (data: string, event: string = 'message') => {
        if (!isActive) return
        try {
          const message = `event: ${event}\ndata: ${data}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error('[SSE] Error sending message:', error)
        }
      }

      // Send keepalive ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        if (isActive) {
          sendMessage('ping', 'ping')
        }
      }, 30000)

      // Fetch leaderboard data
      const fetchLeaderboard = async () => {
        if (!isActive) return

        try {
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          }

          if (lastETag) {
            headers['If-None-Match'] = lastETag
          }

          const response = await fetch(EXTERNAL_API_URL, {
            method: 'GET',
            headers,
            cache: 'no-store',
          })

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

          // Check content type
          const contentType = response.headers.get('content-type') || ''
          if (!contentType.includes('application/json')) {
            const text = await response.text()
            console.error('[SSE] Non-JSON response:', text.substring(0, 200))
            sendMessage(JSON.stringify({ error: 'Invalid response format' }), 'error')
            return
          }

          // Parse response
          const json = await response.json()
          const dataString = JSON.stringify(json)

          // Only send update if data actually changed
          if (dataString !== lastData) {
            lastData = dataString
            sendMessage(dataString, 'update')
          }
        } catch (error) {
          console.error('[SSE] Error fetching leaderboard:', error)
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
        clearInterval(keepAliveInterval)
        controller.close()
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

