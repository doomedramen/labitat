#!/bin/sh
set -e

# Check if config.yaml exists
if [ ! -f /app/config.yaml ]; then
  echo "Error: config.yaml not found!"
  echo "Please create config.yaml from config.yaml.example and mount it to /app/config.yaml"
  exit 1
fi

echo "Running database migrations..."
# Ensure DATABASE_URL is set for drizzle-kit
export DATABASE_URL="${DATABASE_URL:-file:/data/labitat.db}"
# Run drizzle-kit directly from node_modules
node node_modules/drizzle-kit/bin.cjs migrate

echo "Starting Labitat..."
# server.js is from Next.js standalone build output
exec node server.js
