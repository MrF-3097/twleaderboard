#!/bin/bash

# Direct SQLite script to add transaction
# This works if you have direct access to the SQLite database file

DB_PATH="/path/to/dashboard-project/data/database.sqlite"  # Update this path
AGENT_NAME="Sorin Bacila"
TRANSACTION_VALUE=3000
TRANSACTION_TYPE="Vanzare"
COMMISSION_PCT=0.025
COMMISSION=$(echo "$TRANSACTION_VALUE * $COMMISSION_PCT" | bc)
TIMESTAMP="2025-12-15T10:30:00.000Z"
CREATED_AT=$(date +%s)

# Round values for SQL
TRANSACTION_VALUE_ROUNDED=$(echo "scale=2; $TRANSACTION_VALUE/1" | bc)
COMMISSION_ROUNDED=$(echo "scale=2; $COMMISSION/1" | bc)
COMMISSION_PCT_ROUNDED=$(echo "scale=4; $COMMISSION_PCT/1" | bc)

echo "Adding transaction to SQLite database..."
echo "Database: $DB_PATH"
echo "Agent: $AGENT_NAME"
echo "Value: €$TRANSACTION_VALUE_ROUNDED"
echo "Commission: €$COMMISSION_ROUNDED"

# Check if database file exists
if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database file not found at $DB_PATH"
  echo "Please update the DB_PATH variable in this script"
  exit 1
fi

# Insert transaction using sqlite3
sqlite3 "$DB_PATH" <<EOF
INSERT INTO transactions (
  agent,
  valoare_tranzactie,
  tip_tranzactie,
  comision_pct,
  comision,
  timestamp,
  created_at
) VALUES (
  '$AGENT_NAME',
  $TRANSACTION_VALUE_ROUNDED,
  '$TRANSACTION_TYPE',
  $COMMISSION_PCT_ROUNDED,
  $COMMISSION_ROUNDED,
  '$TIMESTAMP',
  $CREATED_AT
);
SELECT 'Transaction added successfully!' as result;
SELECT * FROM transactions WHERE agent = '$AGENT_NAME' ORDER BY id DESC LIMIT 1;
EOF

echo ""
echo "✅ Transaction added successfully!"

