#!/usr/bin/env node

/**
 * Node.js script to add a transaction to the dashboard database
 * This can be run from the dashboard project directory
 * 
 * Usage:
 *   cd /path/to/dashboard-project
 *   node scripts/add-transaction-node.js
 * 
 * Or with custom values:
 *   node scripts/add-transaction-node.js "Sorin Bacila" 3000 Vanzare 0.025 "2025-12-15T10:30:00.000Z"
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuration
const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'database.sqlite');

// Get arguments or use defaults
const agentName = process.argv[2] || 'Sorin Bacila';
const transactionValue = parseFloat(process.argv[3]) || 3000;
const transactionType = process.argv[4] || 'Vanzare';
const commissionPct = parseFloat(process.argv[5]) || 0.025;
const timestamp = process.argv[6] || '2025-12-15T10:30:00.000Z';

// Validate transaction type
if (!['Vanzare', 'Inchiriere'].includes(transactionType)) {
  console.error('Error: Transaction type must be "Vanzare" or "Inchiriere"');
  process.exit(1);
}

// Calculate commission
const commission = transactionValue * commissionPct;

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created database directory: ${dbDir}`);
}

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Error: Database not found at ${dbPath}`);
  console.error('Please run database migrations first or check the path');
  process.exit(1);
}

try {
  // Connect to database
  const db = new Database(dbPath);
  
  // Insert transaction
  const stmt = db.prepare(`
    INSERT INTO transactions (
      agent,
      valoare_tranzactie,
      tip_tranzactie,
      comision_pct,
      comision,
      timestamp,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const createdAt = new Date(timestamp);
  const createdAtUnix = Math.floor(createdAt.getTime() / 1000);
  
  const result = stmt.run(
    agentName,
    Math.round(transactionValue * 100) / 100,
    transactionType,
    Math.round(commissionPct * 10000) / 10000,
    Math.round(commission * 100) / 100,
    timestamp,
    createdAtUnix
  );
  
  console.log('✅ Transaction added successfully!');
  console.log(`   Agent: ${agentName}`);
  console.log(`   Value: €${transactionValue.toFixed(2)}`);
  console.log(`   Type: ${transactionType}`);
  console.log(`   Commission: €${commission.toFixed(2)} (${(commissionPct * 100).toFixed(2)}%)`);
  console.log(`   Date: ${timestamp}`);
  console.log(`   Transaction ID: ${result.lastInsertRowid}`);
  
  // Verify insertion
  const verify = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  console.log('\n📋 Transaction details:');
  console.log(verify);
  
  db.close();
} catch (error) {
  console.error('❌ Error adding transaction:', error.message);
  process.exit(1);
}

