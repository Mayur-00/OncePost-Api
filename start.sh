#!/bin/sh

echo "Checking for database migrations..."
npx prisma migrate deploy

# 1. Start Post Worker in the background (&)
echo "Starting Background Post Worker..."
node --max-old-space-size=100 dist/workers/post/start-worker.js &

# 2. Start Subscription Worker in the background (&)
echo "Starting Background Subscription Worker..."
node --max-old-space-size=92 dist/workers/subscription/start-worker.js &

# 3. Start Monolith Server as the MAIN process (exec)
echo "Starting OncePost Monolith Server..."
exec node --max-old-space-size=256 dist/server.js