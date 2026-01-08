import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'

export const dynamic = 'force-dynamic'

/**
 * POST /api/add-transaction
 * Adds a single transaction to the database
 * 
 * Body:
 * {
 *   agent: string (required)
 *   valoareTranzactie: number (required)
 *   tipTranzactie: 'Vanzare' | 'Inchiriere' (required)
 *   comisionPct: number (required, e.g. 0.025 for 2.5%)
 *   timestamp: string (optional, ISO string, defaults to current date)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      agent,
      valoareTranzactie,
      tipTranzactie,
      comisionPct,
      timestamp,
    } = body

    // Validate required fields
    if (!agent || typeof agent !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent name is required',
        },
        { status: 400 }
      )
    }

    if (typeof valoareTranzactie !== 'number' || valoareTranzactie <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid transaction value (valoareTranzactie) is required',
        },
        { status: 400 }
      )
    }

    if (!tipTranzactie || !['Vanzare', 'Inchiriere'].includes(tipTranzactie)) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction type (tipTranzactie) must be 'Vanzare' or 'Inchiriere'",
        },
        { status: 400 }
      )
    }

    if (typeof comisionPct !== 'number' || comisionPct <= 0 || comisionPct > 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid commission percentage (comisionPct) is required (0-1, e.g. 0.025 for 2.5%)',
        },
        { status: 400 }
      )
    }

    // Parse timestamp or use current date
    let transactionDate: Date
    if (timestamp) {
      transactionDate = new Date(timestamp)
      if (isNaN(transactionDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid timestamp format. Use ISO string (e.g. "2025-12-15T10:30:00.000Z")',
          },
          { status: 400 }
        )
      }
    } else {
      transactionDate = new Date()
    }

    // Calculate commission
    const comision = valoareTranzactie * comisionPct

    // Insert transaction
    const newTransaction = {
      agent: agent.trim(),
      valoareTranzactie: Math.round(valoareTranzactie * 100) / 100,
      tipTranzactie,
      comisionPct: Math.round(comisionPct * 10000) / 10000,
      comision: Math.round(comision * 100) / 100,
      timestamp: transactionDate.toISOString(),
      createdAt: transactionDate,
    }

    await db.insert(transactions).values(newTransaction)

    console.log(`✅ [API] Added transaction: ${agent} - €${valoareTranzactie} (${tipTranzactie})`)

    return NextResponse.json({
      success: true,
      message: 'Transaction added successfully',
      transaction: newTransaction,
    })
  } catch (error) {
    console.error('❌ [API] Error adding transaction:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

