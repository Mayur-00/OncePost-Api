#!/bin/sh

echo "Checking for database migrations..."
# npx prisma migrate deploy applies any pending migrations in your /prisma/migrations folder
# It's safe to run even if there are no new migrations.
npx prisma migrate deploy

echo "Starting OncePost Monolith..."

node --max-old-space-size=256 dist/server.js &

# Start Worker (Foreground)
echo "Starting Background Worker..."

exec node --max-old-space-size=192 dist/workers/start-worker.js