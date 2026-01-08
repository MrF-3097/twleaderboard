#!/bin/bash

# Script to add a transaction to the dashboard database on VPS
# Usage: ./scripts/add-transaction-vps.sh

# Configuration - adjust these based on your dashboard project location
DASHBOARD_PROJECT_PATH="/path/to/dashboard-project"  # Update this path
AGENT_NAME="Sorin Bacila"
TRANSACTION_VALUE=3000
TRANSACTION_TYPE="Vanzare"
COMMISSION_PCT=0.025
TIMESTAMP="2025-12-15T10:30:00.000Z"

# Calculate commission
COMMISSION=$(echo "$TRANSACTION_VALUE * $COMMISSION_PCT" | bc)

echo "Adding transaction for $AGENT_NAME..."
echo "Value: €$TRANSACTION_VALUE"
echo "Commission: €$COMMISSION"
echo "Date: $TIMESTAMP"

# Option 1: If dashboard has an API endpoint
if [ -d "$DASHBOARD_PROJECT_PATH" ]; then
  cd "$DASHBOARD_PROJECT_PATH"
  
  # Try to call the API if it exists
  curl -X POST http://localhost:3001/api/add-transaction \
    -H "Content-Type: application/json" \
    -d "{
      \"agent\": \"$AGENT_NAME\",
      \"valoareTranzactie\": $TRANSACTION_VALUE,
      \"tipTranzactie\": \"$TRANSACTION_TYPE\",
      \"comisionPct\": $COMMISSION_PCT,
      \"timestamp\": \"$TIMESTAMP\"
    }"
  
  echo ""
  echo "Transaction added via API"
else
  echo "Dashboard project not found at $DASHBOARD_PROJECT_PATH"
  echo "Please update the path in this script or add transaction manually"
fi

