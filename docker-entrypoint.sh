#!/bin/sh
set -e

# Auto-generate and persist SECRET_KEY if not explicitly provided
DEFAULT_PLACEHOLDER="change_me_to_a_random_32_char_string_minimum"
if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "$DEFAULT_PLACEHOLDER" ]; then
  KEY_FILE="/data/.secret_key"
  if [ -f "$KEY_FILE" ]; then
    SECRET_KEY=$(cat "$KEY_FILE")
    export SECRET_KEY
  else
    SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    export SECRET_KEY
    printf '%s' "$SECRET_KEY" > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo "[labitat] Generated SECRET_KEY — saved to $KEY_FILE"
    echo "[labitat] Back this file up! Losing it means losing access to saved credentials."
  fi
fi

echo "Running database migrations..."
node scripts/migrate.js

echo "Starting Labitat..."
exec node server.js
