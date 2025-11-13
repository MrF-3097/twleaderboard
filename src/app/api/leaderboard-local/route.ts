import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { gte, eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [API] GET /api/leaderboard-local')
    
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const agent = searchParams.get('agent')

    // Build query conditions
    const conditions = []
    if (since) {
      conditions.push(gte(transactions.timestamp, since))
    }
    if (agent) {
      conditions.push(eq(transactions.agent, agent))
    }

    // Query and aggregate using SQL
    let query = db
      .select({
        Agent: transactions.agent,
        NrTranzactii: sql<number>`count(*)`,
        SumaValoare: sql<number>`sum(${transactions.valoareTranzactie})`,
        SumaComision: sql<number>`sum(${transactions.comision})`,
      })
      .from(transactions)
      .groupBy(transactions.agent)

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    const rows = await query
    console.log(`🔵 [API] Aggregated ${rows.length} agents from database`)

    // Convert to array and sort by commission
    const leaderboardRows = rows
      .sort((a, b) => b.SumaComision - a.SumaComision)
      .map((r, idx) => ({ Rank: idx + 1, ...r }))

    console.log(`✅ [API] Generated leaderboard with ${leaderboardRows.length} agents`)

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      count: leaderboardRows.length,
      rows: leaderboardRows,
    })

  } catch (error) {
    console.error('❌ [API] Error generating leaderboard:', error)
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        count: 0,
        rows: [],
      },
      { status: 200 }
    )
  }
}

