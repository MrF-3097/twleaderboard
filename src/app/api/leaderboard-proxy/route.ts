import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Use Node.js runtime for better HTTP support (edge runtime may have issues with HTTP URLs)

/**
 * Proxy route for external leaderboard API
 * This avoids CORS issues by fetching from the server side
 */
const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL || 'http://185.92.192.127:3002/api/leaderboard'

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

    console.log('[Proxy] Fetching from:', apiUrl)

    // Get ETag from request headers
    const ifNoneMatch = request.headers.get('if-none-match')

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch
    }

    // Fetch from external API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    // Handle 304 Not Modified
    if (response.status === 304) {
      return new NextResponse(null, { status: 304 })
    }

    // Check if response is successful
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Proxy] API returned ${response.status}:`, errorText.substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: `API returned ${response.status}: ${response.statusText}`,
          message: 'External API error',
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
    console.error('[Proxy] Error fetching external leaderboard:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch leaderboard',
        message: 'Network error connecting to external API',
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

