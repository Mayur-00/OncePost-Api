#!/bin/sh

echo "Checking for database migrations..."

echo "Checking for database migrations..."

# Retry migrate deploy up to 5 times with a delay
MAX_RETRIES=5
RETRY_DELAY=5
attempt=1

until npx prisma migrate deploy; do
  if [ $attempt -ge $MAX_RETRIES ]; then
    echo "Migration failed after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "Migration attempt $attempt failed. Retrying in ${RETRY_DELAY}s..."
  attempt=$((attempt + 1))
  sleep $RETRY_DELAY
done

echo "Migrations applied successfully."

echo "Starting OncePost Monolith..."

node --max-old-space-size=256 dist/server.js &

# Start Worker (Foreground)
echo "Starting Background Post Worker..."
node --max-old-space-size=100 dist/workers/post/start-worker.js &

echo "Starting Background Subscription Worker..."

exec node --max-old-space-size=92 dist/workers/subscription/start-worker.js