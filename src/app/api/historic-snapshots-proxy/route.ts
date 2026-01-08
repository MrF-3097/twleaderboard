import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Proxy route for historic snapshots API
 * This avoids CORS issues by fetching from the server side
 */
const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL?.replace('/api/leaderboard', '/api/historic-snapshots') 
  || 'http://127.0.0.1:3000/api/historic-snapshots'

/**
 * GET /api/historic-snapshots-proxy
 * 
 * Proxy for fetching historic snapshots
 * Query parameters are forwarded to the external API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Build query string for external API
    const queryParams = new URLSearchParams()
    if (year) queryParams.set('year', year)
    if (month) queryParams.set('month', month)

    const apiUrl = queryParams.toString()
      ? `${EXTERNAL_API_URL}?${queryParams.toString()}`
      : EXTERNAL_API_URL

    console.log(`[Historic Snapshots Proxy] GET ${apiUrl}`)

    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json()

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })

  } catch (error) {
    console.error('[Historic Snapshots Proxy] Error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Request timeout' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch historic snapshots',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/historic-snapshots-proxy
 * 
 * Proxy for saving historic snapshots
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log(`[Historic Snapshots Proxy] POST ${EXTERNAL_API_URL}`)

    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(EXTERNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json()

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('[Historic Snapshots Proxy] Error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Request timeout' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save historic snapshot',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

