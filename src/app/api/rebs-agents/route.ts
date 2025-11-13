import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * REBS CRM API Configuration
 */
const REBS_API_BASE = process.env.REBS_API_BASE || 'https://towerimob.crmrebs.com/api/public'
const REBS_API_KEY = process.env.REBS_API_KEY || 'ee93793d23fb4cdfc27e581a300503bda245b7c8'

/**
 * Interface for REBS Agent response
 */
interface RebsAgent {
  id?: number | string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  avatar?: string | null
  profile_picture?: string | null
  profilePicture?: string | null
  photo?: string | null
  image?: string | null
  position?: string | null
  resource_uri?: string
  [key: string]: any // Allow additional fields
}

/**
 * Normalize REBS agent data to standard format
 */
const normalizeRebsAgent = (agent: RebsAgent): RebsAgent => {
  // Build full name from first_name and last_name if name is not available
  if (!agent.name && (agent.first_name || agent.last_name)) {
    agent.name = [agent.first_name, agent.last_name].filter(Boolean).join(' ')
  }

  // Normalize avatar/profile_picture fields
  // REBS API might use different field names, so check multiple possibilities
  const avatarUrl =
    agent.avatar ||
    agent.profile_picture ||
    agent.profilePicture ||
    agent.photo ||
    agent.image ||
    null

  // Ensure avatar URL is absolute (REBS might return relative URLs)
  let normalizedAvatar = avatarUrl
  if (normalizedAvatar && typeof normalizedAvatar === 'string') {
    // If it's a relative URL, make it absolute
    if (normalizedAvatar.startsWith('/')) {
      normalizedAvatar = `${REBS_API_BASE.replace('/api/public', '')}${normalizedAvatar}`
    }
    // If it's a relative path without leading slash, add base URL
    else if (!normalizedAvatar.startsWith('http')) {
      normalizedAvatar = `${REBS_API_BASE.replace('/api/public', '')}/${normalizedAvatar}`
    }
  }

  return {
    ...agent,
    name: agent.name || 'Unknown Agent',
    avatar: normalizedAvatar,
    profile_picture: normalizedAvatar,
    email: agent.email || undefined,
    phone: agent.phone || undefined,
    position: agent.position || undefined,
  }
}

/**
 * Fetch agents from REBS CRM API
 * GET /api/rebs-agents
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('id')
    const agentName = searchParams.get('name')

    // Build API URL
    let apiUrl = `${REBS_API_BASE}/agent/`
    
    // Add query parameters (excluding api_key - using Bearer token instead)
    const queryParams = new URLSearchParams()
    
    if (agentId) {
      queryParams.set('id', agentId)
      apiUrl = `${REBS_API_BASE}/agent/${agentId}/`
    } else if (agentName) {
      queryParams.set('name', agentName)
      apiUrl = `${apiUrl}?${queryParams.toString()}`
    }

    console.log(`[REBS API] Fetching agents from: ${apiUrl}`)

    // Use Authorization header with raw API key (as per REBS documentation)
    // Format: Authorization: <api_key> (NOT Bearer <api_key>)
    let response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': REBS_API_KEY, // Raw API key, no Bearer prefix
      },
      cache: 'no-store',
    })

    // Fallback: If Authorization header fails, try query parameter method
    if (!response.ok && response.status !== 404 && response.status !== 401) {
      console.log('[REBS API] Authorization header failed, trying query parameter method as fallback...')
      const fallbackUrl = agentId
        ? `${REBS_API_BASE}/agent/${agentId}/?api_key=${REBS_API_KEY}`
        : agentName
        ? `${REBS_API_BASE}/agent/?api_key=${REBS_API_KEY}&name=${encodeURIComponent(agentName)}`
        : `${REBS_API_BASE}/agent/?api_key=${REBS_API_KEY}`
      
      response = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })
    }

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[REBS API] No agents found (404)')
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          timestamp: new Date().toISOString(),
          source: 'rebs_api',
          message: 'No agents found',
        })
      }

      const errorText = await response.text()
      throw new Error(`REBS API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseData = await response.json()
    console.log(`[REBS API] Response received, processing...`)

    // Handle different response structures
    let agents: RebsAgent[] = []

    if (Array.isArray(responseData)) {
      // Direct array response
      agents = responseData
    } else if (responseData.objects && Array.isArray(responseData.objects)) {
      // Paginated response with objects array
      agents = responseData.objects
    } else if (responseData.data && Array.isArray(responseData.data)) {
      // Wrapped in data property
      agents = responseData.data
    } else if (responseData.results && Array.isArray(responseData.results)) {
      // Wrapped in results property
      agents = responseData.results
    } else if (typeof responseData === 'object' && !Array.isArray(responseData)) {
      // Single agent object
      agents = [responseData]
    } else {
      console.warn('[REBS API] Unexpected response structure:', typeof responseData)
      agents = []
    }

    // Normalize all agents
    const normalizedAgents = agents.map(normalizeRebsAgent)

    console.log(`[REBS API] ✅ Successfully fetched ${normalizedAgents.length} agents`)

    return NextResponse.json({
      success: true,
      data: normalizedAgents,
      count: normalizedAgents.length,
      timestamp: new Date().toISOString(),
      source: 'rebs_api',
    })
  } catch (error) {
    console.error('[REBS API] Error fetching agents:', error)

    // Return empty array on error (don't break the app)
    return NextResponse.json(
      {
        success: false,
        data: [],
        count: 0,
        timestamp: new Date().toISOString(),
        source: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

