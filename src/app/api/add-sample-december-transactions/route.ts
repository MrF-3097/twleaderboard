import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { gte, lte, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Sample agent names - you can modify these to match your actual agents
const sampleAgents = [
  'Ion Popescu',
  'Maria Ionescu',
  'Gheorghe Radu',
  'Elena Dumitru',
  'Alexandru Stoica',
  'Andreea Marin',
  'Mihai Georgescu',
  'Cristina Nistor',
  'Radu Constantinescu',
  'Ioana Stanciu',
]

/**
 * Generate random transactions for December 2025
 */
function generateDecemberTransactions() {
  const transactionList = []
  
  // December 2025 dates
  const startDate = new Date('2025-12-01T00:00:00.000Z')
  const endDate = new Date('2025-12-31T23:59:59.999Z')
  
  // Generate 75 random transactions across December
  const numTransactions = 75
  
  for (let i = 0; i < numTransactions; i++) {
    // Random date in December 2025
    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    const timestamp = new Date(randomTime)
    
    // Random agent
    const agent = sampleAgents[Math.floor(Math.random() * sampleAgents.length)]
    
    // Random transaction type
    const tipTranzactie = Math.random() > 0.5 ? 'Vanzare' : 'Inchiriere'
    
    // Random transaction value (between 50k and 500k for sales, 5k-50k for rentals)
    const valoareTranzactie = tipTranzactie === 'Vanzare' 
      ? 50000 + Math.random() * 450000
      : 5000 + Math.random() * 45000
    
    // Random commission percentage (between 1.5% and 3.5%)
    const comisionPct = 0.015 + Math.random() * 0.02
    
    // Calculate commission
    const comision = valoareTranzactie * comisionPct
    
    transactionList.push({
      agent,
      valoareTranzactie: Math.round(valoareTranzactie * 100) / 100,
      tipTranzactie,
      comisionPct: Math.round(comisionPct * 10000) / 10000, // 4 decimal places
      comision: Math.round(comision * 100) / 100,
      timestamp: timestamp.toISOString(),
      createdAt: timestamp,
    })
  }
  
  return transactionList
}

/**
 * POST /api/add-sample-december-transactions
 * Adds sample transactions for December 2025 to the database
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📝 [API] Generating sample transactions for December 2025...')
    
    // Check if transactions already exist for December 2025
    const existingCount = await db.select().from(transactions)
      .where(
        and(
          gte(transactions.timestamp, '2025-12-01T00:00:00.000Z'),
          lte(transactions.timestamp, '2025-12-31T23:59:59.999Z')
        )
      )
    
    if (existingCount.length > 0) {
      return NextResponse.json({
        success: false,
        message: `December 2025 already has ${existingCount.length} transactions. Delete them first if you want to add new ones.`,
        existingCount: existingCount.length,
      }, { status: 400 })
    }
    
    const sampleTransactions = generateDecemberTransactions()
    
    console.log(`📦 [API] Inserting ${sampleTransactions.length} transactions into database...`)
    
    // Insert transactions in batches
    const batchSize = 20
    let inserted = 0
    for (let i = 0; i < sampleTransactions.length; i += batchSize) {
      const batch = sampleTransactions.slice(i, i + batchSize)
      await db.insert(transactions).values(batch)
      inserted += batch.length
      console.log(`  ✓ [API] Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sampleTransactions.length / batchSize)}`)
    }
    
    // Verify insertion
    const verifyCount = await db.select().from(transactions)
      .where(
        and(
          gte(transactions.timestamp, '2025-12-01T00:00:00.000Z'),
          lte(transactions.timestamp, '2025-12-31T23:59:59.999Z')
        )
      )
    
    // Show summary by agent
    const agentSummary = new Map<string, number>()
    sampleTransactions.forEach(t => {
      agentSummary.set(t.agent, (agentSummary.get(t.agent) || 0) + 1)
    })
    
    const summary = Array.from(agentSummary.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([agent, count]) => ({ agent, count }))
    
    console.log(`✅ [API] Successfully inserted ${inserted} transactions for December 2025!`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully inserted ${inserted} transactions for December 2025`,
      inserted: inserted,
      verified: verifyCount.length,
      summary: summary,
    })
    
  } catch (error) {
    console.error('❌ [API] Error inserting transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/add-sample-december-transactions
 * Removes all transactions for December 2025
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [API] Deleting December 2025 transactions...')
    
    // Get count before deletion
    const beforeCount = await db.select().from(transactions)
      .where(
        and(
          gte(transactions.timestamp, '2025-12-01T00:00:00.000Z'),
          lte(transactions.timestamp, '2025-12-31T23:59:59.999Z')
        )
      )
    
    // Delete transactions
    await db.delete(transactions)
      .where(
        and(
          gte(transactions.timestamp, '2025-12-01T00:00:00.000Z'),
          lte(transactions.timestamp, '2025-12-31T23:59:59.999Z')
        )
      )
    
    console.log(`✅ [API] Deleted ${beforeCount.length} December 2025 transactions`)
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${beforeCount.length} transactions for December 2025`,
      deleted: beforeCount.length,
    })
    
  } catch (error) {
    console.error('❌ [API] Error deleting transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

