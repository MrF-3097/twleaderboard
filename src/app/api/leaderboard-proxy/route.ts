import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Use Node.js runtime for better HTTP support (edge runtime may have issues with HTTP URLs)

/**
 * Proxy route for external leaderboard API
 * This avoids CORS issues by fetching from the server side
 */
const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL || 'http://127.0.0.1:3000/api/leaderboard'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const agent = searchParams.get('agent')
    const limit = searchParams.get('limit')
    const includeStats = searchParams.get('include_stats')

    // Build query string for external API
    const queryParams = new URLSearchParams()
    if (since) queryParams.set('since', since)
    if (agent) queryParams.set('agent', agent)
    if (limit) queryParams.set('limit', limit)
    if (includeStats !== null) queryParams.set('include_stats', includeStats || 'true')

    const apiUrl = queryParams.toString()
      ? `${EXTERNAL_API_URL}?${queryParams.toString()}`
      : EXTERNAL_API_URL

    // Get ETag from request headers
    const ifNoneMatch = request.headers.get('if-none-match')

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch
    }

    // Fetch from external API with timeout
    // Increased timeout to 15s to account for REBS API delays
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    let response: Response
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[Proxy] Request timeout after 15s: ${apiUrl}`)
        return NextResponse.json(
          {
            success: false,
            error: 'Request timeout - external API did not respond within 15 seconds',
            message: 'The dashboard API is taking too long to respond. Check if the dashboard service is running and if REBS API is accessible.',
            endpoint: apiUrl,
          },
          { status: 504 } // Gateway Timeout
        )
      }
      throw error
    }

    // Handle 304 Not Modified
    if (response.status === 304) {
      return new NextResponse(null, { status: 304 })
    }

    // Check if response is successful
    if (!response.ok) {
      const errorText = await response.text()
      
      // Only log the first error or periodically to reduce spam
      const shouldLogError = Math.random() < 0.1 // Log 10% of errors to reduce spam
      if (shouldLogError || response.status === 404) {
        console.error(`[Proxy] API returned ${response.status} from ${apiUrl}`)
        if (response.status === 404) {
          console.error(`[Proxy] ⚠️  Endpoint not found. Check if API URL is correct: ${EXTERNAL_API_URL}`)
          console.error(`[Proxy] Set NEXT_PUBLIC_LEADERBOARD_API_URL environment variable if path is different`)
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: `API returned ${response.status}: ${response.statusText}`,
          message: 'External API error',
          endpoint: apiUrl,
        },
        { status: response.status }
      )
    }

    // Check content type before parsing
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      console.error('[Proxy] Non-JSON response received:', text.substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: `Expected JSON but received ${contentType}`,
          message: 'Invalid response format from external API',
          details: text.substring(0, 200),
        },
        { status: 502 }
      )
    }

    // Get ETag from response
    const etag = response.headers.get('ETag')

    // Parse response
    const data = await response.json()

    // Create response with CORS headers
    const nextResponse = NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        ...(etag && { ETag: etag }),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
      },
    })

    return nextResponse
  } catch (error) {
    // Throttle error logging to reduce spam (log only 10% of errors)
    if (Math.random() < 0.1) {
      console.error('[Proxy] Error fetching external leaderboard:', error)
      console.error(`[Proxy] Attempted URL: ${EXTERNAL_API_URL}`)
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch leaderboard',
        message: 'Network error connecting to external API',
        endpoint: EXTERNAL_API_URL,
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
    },
  })
}

