/**
 * Script to add sample transactions for December 2025
 * Run with: npx tsx scripts/add-sample-december-transactions.ts
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { transactions } from '../src/db/schema'
import { gte, lte, and } from 'drizzle-orm'
import * as path from 'path'
import * as fs from 'fs'

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite')

// Ensure data directory exists
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const sqlite = new Database(dbPath)
const db = drizzle(sqlite, { schema: { transactions } })

// Sample agent names (you can modify these to match your actual agents)
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
  const transactions = []
  
  // December 2025 dates
  const startDate = new Date('2025-12-01T00:00:00.000Z')
  const endDate = new Date('2025-12-31T23:59:59.999Z')
  
  // Generate 50-100 random transactions across December
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
    
    transactions.push({
      agent,
      valoareTranzactie: Math.round(valoareTranzactie * 100) / 100,
      tipTranzactie,
      comisionPct: Math.round(comisionPct * 10000) / 10000, // 4 decimal places
      comision: Math.round(comision * 100) / 100,
      timestamp: timestamp.toISOString(),
      createdAt: timestamp,
    })
  }
  
  return transactions
}

async function main() {
  try {
    console.log('📝 Generating sample transactions for December 2025...')
    
    const sampleTransactions = generateDecemberTransactions()
    
    console.log(`📦 Inserting ${sampleTransactions.length} transactions into database...`)
    
    // Insert transactions in batches
    const batchSize = 20
    for (let i = 0; i < sampleTransactions.length; i += batchSize) {
      const batch = sampleTransactions.slice(i, i + batchSize)
      await db.insert(transactions).values(batch)
      console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sampleTransactions.length / batchSize)}`)
    }
    
    // Verify insertion
    const count = await db.select().from(transactions)
      .where(
        and(
          gte(transactions.timestamp, '2025-12-01T00:00:00.000Z'),
          lte(transactions.timestamp, '2025-12-31T23:59:59.999Z')
        )
      )
    
    console.log(`\n✅ Successfully inserted ${sampleTransactions.length} transactions for December 2025!`)
    console.log(`📊 Total December 2025 transactions in database: ${count.length}`)
    
    // Show summary by agent
    const agentSummary = new Map<string, number>()
    sampleTransactions.forEach(t => {
      agentSummary.set(t.agent, (agentSummary.get(t.agent) || 0) + 1)
    })
    
    console.log('\n📈 Transactions by agent:')
    Array.from(agentSummary.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([agent, count]) => {
        console.log(`  ${agent}: ${count} transactions`)
      })
    
  } catch (error) {
    console.error('❌ Error inserting transactions:', error)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

main()

