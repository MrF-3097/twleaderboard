import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { gte, eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [API] GET /api/transactions-local')
    
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

    // Query database
    const rows = conditions.length > 0
      ? await db.select().from(transactions).where(and(...conditions))
      : await db.select().from(transactions)

    console.log(`🔵 [API] Loaded ${rows.length} transactions from database`)

    // Convert to old format for backward compatibility
    const formatted = rows.map(row => ({
      Agent: row.agent,
      'Valoare Tranzactie': row.valoareTranzactie,
      'Tip Tranzactie': row.tipTranzactie,
      'Comision %': row.comisionPct,
      Comision: row.comision,
      Timestamp: row.timestamp,
    }))

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      count: formatted.length,
      rows: formatted,
    })

  } catch (error) {
    console.error('❌ [API] Error reading transactions:', error)
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

