import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REBS_API_BASE = process.env.REBS_API_BASE || 'https://towerimob.crmrebs.com/api/public'
const REBS_API_KEY = process.env.REBS_API_KEY || 'ee93793d23fb4cdfc27e581a300503bda245b7c8'
const USE_MOCK_DATA = false // Using real REBS API now

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
  [key: string]: any
}

/**
 * Normalize REBS agent data to standard format with proper avatar handling
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

// Mock data for development/testing
const mockAgents = [
  {
    id: 1,
    name: 'Maria Popescu',
    email: 'maria.popescu@rebs.ro',
    phone: '+40 722 123 456',
    avatar: 'https://i.pravatar.cc/150?img=1',
    profile_picture: 'https://i.pravatar.cc/150?img=1',
    closed_transactions: 28,
    total_value: 3500000,
    active_listings: 12,
    last_transaction_date: '2025-10-05',
  },
  {
    id: 2,
    name: 'Ion Ionescu',
    email: 'ion.ionescu@rebs.ro',
    phone: '+40 722 234 567',
    avatar: 'https://i.pravatar.cc/150?img=12',
    profile_picture: 'https://i.pravatar.cc/150?img=12',
    closed_transactions: 25,
    total_value: 3200000,
    active_listings: 8,
    last_transaction_date: '2025-10-04',
  },
]

export async function GET(request: NextRequest) {
  // Return mock data if enabled
  if (USE_MOCK_DATA) {
    console.log('Using mock agent data (REBS API endpoints return 404)')
    const normalizedMockAgents = mockAgents.map(normalizeRebsAgent)
    return NextResponse.json({
      success: true,
      data: normalizedMockAgents,
      timestamp: new Date().toISOString(),
      source: 'mock_data',
      count: normalizedMockAgents.length,
    })
  }

  try {
    // Use Authorization header with raw API key (as per REBS documentation)
    // Format: Authorization: <api_key> (NOT Bearer <api_key>)
    const apiUrl = `${REBS_API_BASE}/agent/`
    console.log(`[REBS API] Fetching agents with Authorization header from: ${apiUrl}`)

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
      response = await fetch(`${apiUrl}?api_key=${REBS_API_KEY}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })
    }

    if (response.ok) {
      const responseData = await response.json()
      console.log('✅ Successfully fetched agents from REBS API')
      
      // Handle different response structures
      let agents: RebsAgent[] = []

      if (Array.isArray(responseData)) {
        agents = responseData
      } else if (responseData.objects && Array.isArray(responseData.objects)) {
        agents = responseData.objects
      } else if (responseData.data && Array.isArray(responseData.data)) {
        agents = responseData.data
      } else if (responseData.results && Array.isArray(responseData.results)) {
        agents = responseData.results
      } else if (typeof responseData === 'object' && !Array.isArray(responseData)) {
        agents = [responseData]
      }

      // Normalize all agents to ensure avatars are properly formatted
      const normalizedAgents = agents.map(normalizeRebsAgent)

      return NextResponse.json({
        success: true,
        data: normalizedAgents,
        timestamp: new Date().toISOString(),
        source: 'rebs_api',
        count: normalizedAgents.length,
      })
    }

    const lastError = `Status ${response.status}: ${response.statusText}`
    console.log(`❌ REBS API failed: ${lastError}`)

    // If all methods fail, return mock data as fallback
    console.log('All REBS API methods failed, returning mock data')
    const normalizedMockAgents = mockAgents.map(normalizeRebsAgent)
    return NextResponse.json({
      success: true,
      data: normalizedMockAgents,
      timestamp: new Date().toISOString(),
      source: 'mock_data_fallback',
      error: lastError,
      count: normalizedMockAgents.length,
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    // Return mock data even on error
    const normalizedMockAgents = mockAgents.map(normalizeRebsAgent)
    return NextResponse.json({
      success: true,
      data: normalizedMockAgents,
      timestamp: new Date().toISOString(),
      source: 'mock_data_error_fallback',
      count: normalizedMockAgents.length,
    })
  }
}

