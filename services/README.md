# GATE Worker Service — Runbook

## Overview
The GATE worker is a standalone Node.js process (NOT Next.js/Edge) that:
1. **Event Drain**: Consumes Redis attempt events → upserts to Postgres
2. **Finalize Grading**: Grades submitted attempts using decimal.js
3. **Orphan Sweeper**: Finalizes stuck IN_PROGRESS attempts (every ~90s)
4. **Demo Cleanup**: Deletes expired demo attempts

## Required Environment Variables
```env
REDIS_URL=redis://localhost:6379          # Redis/ElastiCache connection string
SUPABASE_URL=https://xxx.supabase.co      # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Service role key (not anon key)
DATABASE_URL=postgresql://...              # Direct Postgres (optional, for migrations)
```

## Local Development
```bash
cd services/gate-worker
npm install
npm run dev
```

## Production Deployment
```bash
# Build
npm run build

# Run
node dist/index.js

# Or via Docker
docker build -t gate-worker .
docker run -d \
  --env-file .env \
  --name gate-worker \
  gate-worker
```

## How to Verify (Smoke Checklist)

1. **Worker starts**: `[gate-worker] Starting event drain loop...` in logs
2. **Sweeper runs**: `[sweeper] Found 0 orphaned attempts` on startup
3. **Event processing**: Start a test attempt, save answers, submit
   - Check Postgres `gate.attempt_results` for graded entry
4. **Orphan recovery**: Create an attempt, let timer expire, wait 2 min
   - Verify attempt is auto-finalized in `gate.attempts` (status = SUBMITTED)
5. **Demo cleanup**: Create a demo attempt with `expires_at` in the past
   - Verify it gets deleted after sweeper runs

## Architecture Notes
- Worker connects to Redis via `REDIS_URL` using ioredis
- Uses `XREAD BLOCK` for efficient event streaming
- Sweeper runs on `setInterval` every 90 seconds
- Graceful shutdown on SIGTERM/SIGINT
- Minimum recommended: 4 vCPU, 16GB RAM for 2,500 concurrent users
