#!/bin/sh
set -e

echo "Running database migrations..."
node scripts/migrate.js

echo "Starting Labitat..."
# server.js is from Next.js standalone build output
exec node server.js
