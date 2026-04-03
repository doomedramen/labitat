#!/bin/sh
set -e

# Check if config.yaml exists
if [ ! -f /app/config.yaml ]; then
  echo "Error: config.yaml not found!"
  echo "Please create config.yaml from config.yaml.example and mount it to /app/config.yaml"
  exit 1
fi

echo "Starting Labitat..."
# server.js is from Next.js standalone build output
exec node server.js
