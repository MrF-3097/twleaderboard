#!/bin/bash

# Script to set up the dashboard database
# Run this in the dashboard project directory

echo "Setting up dashboard database..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found. Please run this script from the dashboard project root."
  exit 1
fi

# Check if drizzle config exists
if [ ! -f "drizzle.config.ts" ] && [ ! -f "drizzle.config.js" ]; then
  echo "Error: drizzle.config not found. Please ensure Drizzle is set up."
  exit 1
fi

# Run database push to create tables
echo "Creating database tables..."
npm run db:push

if [ $? -eq 0 ]; then
  echo "✅ Database tables created successfully!"
  echo ""
  echo "You can now add transactions using:"
  echo "  curl -X POST http://localhost:3001/api/add-transaction ..."
else
  echo "❌ Error creating database tables"
  echo "Please check the error messages above"
  exit 1
fi

