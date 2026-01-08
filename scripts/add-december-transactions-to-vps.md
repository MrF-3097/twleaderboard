# Add December 2025 Transactions to VPS

## Option 1: Using the API Endpoint (If Available)

SSH into your VPS and run:

```bash
# Make a POST request to add transactions
curl -X POST http://localhost:3000/api/add-sample-december-transactions

# Or if using a different port
curl -X POST http://localhost:<PORT>/api/add-sample-december-transactions
```

## Option 2: Direct Database Script

1. SSH into your VPS
2. Navigate to your dashboard project directory
3. Create a script or use Node.js to insert the transactions directly

## Option 3: Use the Script File

If you can access the leaderboard TV display project on the VPS:

```bash
# On VPS
cd /path/to/leaderboard-tv-display
npx tsx scripts/add-sample-december-transactions.ts
```

