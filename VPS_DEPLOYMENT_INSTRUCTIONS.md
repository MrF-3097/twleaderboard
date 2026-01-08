# Adding December 2025 Transactions to VPS

## Quick Solution

SSH into your VPS and run one of these options:

### Option 1: Call the API Endpoint (If already deployed)

```bash
# SSH into VPS first, then:
curl -X POST http://localhost:3000/api/add-sample-december-transactions
```

### Option 2: Add Transactions via Dashboard API (Recommended)

Since the dashboard project (`twdashboard-dev`) has the transaction database, you need to add the endpoint there OR run a direct database script.

**Steps:**
1. SSH into your VPS
2. Navigate to the dashboard project directory
3. Either:
   - Copy the endpoint from `src/app/api/add-sample-december-transactions/route.ts` to your dashboard project
   - Or run the database script directly

### Option 3: Direct SQL Insert (Fastest)

If you have SQLite access on the VPS:

```bash
# SSH into VPS
cd /path/to/dashboard-project

# Access SQLite database
sqlite3 data/database.sqlite

# Then use the provided SQL script or generate transactions
```

## Notes

- The leaderboard TV display project is `twleaderboard-dev` (port shown in logs)
- The dashboard project with transactions is `twdashboard-dev` 
- Transactions need to be in the dashboard project's database for the external API to return them
- The endpoint we created is currently only in the leaderboard TV display project

