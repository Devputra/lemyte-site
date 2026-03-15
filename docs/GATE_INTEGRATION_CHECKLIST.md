# GATE Integration Checklist & Runbook

## 1. Prerequisites

### System Requirements
- Node 20.x LTS (detected from existing repo; do NOT change .nvmrc or engines)
- npm (package manager)
- Supabase account (remote) with Postgres access
- Redis instance (local Docker or AWS ElastiCache)
- Razorpay merchant account (India-only)
- AWS S3 bucket in ap-south-1 (for media assets)

### New npm Dependencies
```bash
npm install ioredis decimal.js
npm install -D vitest
```

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in values.

**New variables required for GATE (in addition to existing):**

| Variable | Purpose | Example |
|----------|---------|---------|
| `REDIS_URL` | Redis/ElastiCache connection | `redis://localhost:6379` |
| `RAZORPAY_KEY_ID` | Razorpay API key | `rzp_live_xxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | `xxx` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret | `xxx` |
| `GATE_S3_BUCKET` | S3 bucket for media | `learnamyte-gate-media` |
| `GATE_S3_REGION` | S3 region | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | `xxx` |
| `DATABASE_URL` | Direct Postgres URL (for worker) | `postgresql://...` |

## 3. Database Migrations

### Apply Schema
```bash
# Option A: Supabase SQL Editor — paste file contents
# Option B: psql direct connection
psql "$DATABASE_URL" -f db/gate/schema.sql
psql "$DATABASE_URL" -f db/gate/rls_policies.sql
psql "$DATABASE_URL" -f db/gate/seed.sql
```

### Validate RLS
```bash
psql "$DATABASE_URL" -f db/gate/rls_validation.sql
# Every `should_be_zero` column MUST return 0
```

### Schema Notes
- All GATE tables live in the `gate` schema (not `public`)
- The `gate.current_user_role()` helper function is created by `rls_policies.sql`
- The unique partial index `idx_attempts_one_active_per_user` enforces exactly 1 active attempt per authenticated user
- Cascading deletes clean up child records when demo attempts are swept

## 4. Running the Next.js App

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### New Routes Added
| Route | Type |
|-------|------|
| `/gate` | Landing page |
| `/gate/demo` | Demo entry |
| `/gate/pricing` | Pricing page |
| `/gate/attempt/[attemptId]` | Exam simulator |
| `/gate/report/[attemptId]` | Analytics report |
| `/api/gate/attempts/start` | POST — start attempt |
| `/api/gate/attempts/[id]` | GET — resume/load |
| `/api/gate/attempts/[id]/heartbeat` | PUT |
| `/api/gate/attempts/[id]/answer` | PUT |
| `/api/gate/attempts/[id]/mark` | PUT |
| `/api/gate/attempts/[id]/clear` | PUT |
| `/api/gate/attempts/[id]/submit` | POST |
| `/api/gate/attempts/[id]/report` | GET |
| `/api/gate/sme/import` | POST |
| `/api/gate/sme/import/[batchId]` | GET |
| `/api/gate/media/presign` | POST |
| `/api/gate/errata/report` | POST |
| `/api/gate/errata/publish` | POST |
| `/api/webhooks/razorpay` | POST |

### Middleware
- Existing middleware at `src/middleware.ts` is UNCHANGED
- `/gate/*` is NOT in the WIP list, so no rewrites apply
- GATE pricing uses `/gate/pricing` (not `/pricing` which middleware rewrites)

## 5. Running the Worker

```bash
cd services/gate-worker
npm install
npx tsx src/index.ts
```

Or with Docker:
```bash
cd services/gate-worker
docker build -t gate-worker .
docker run -d --env-file ../../.env.local gate-worker
```

### Worker Responsibilities
1. **Event drain loop**: Consumes `lm:attempt_events` Redis stream → upserts to Postgres
2. **Finalize grading**: On SUBMIT events, grades attempt using decimal.js
3. **Orphan sweeper**: Every ~90s, finalizes IN_PROGRESS attempts past `ends_at + 5s`
4. **Demo cleanup**: Deletes expired demo attempts (24h TTL)

## 6. Running Tests

```bash
# Run all GATE engine tests
npx vitest run

# Run specific test suite
npx vitest run src/lib/gate/__tests__/scoring.test.ts
npx vitest run src/lib/gate/__tests__/nat.test.ts
npx vitest run src/lib/gate/__tests__/blueprint.test.ts
npx vitest run src/lib/gate/__tests__/shuffle.test.ts
npx vitest run src/lib/gate/__tests__/palette.test.ts
```

### Test Coverage
| Suite | What's Tested |
|-------|---------------|
| `scoring.test.ts` | MCQ +1, +2, -1/3, -2/3 fractional exactness; MSQ all-or-nothing; NAT bounds; attempt total |
| `nat.test.ts` | Reject sci notation; reject excess precision; round-half-up; empty input; negative values |
| `blueprint.test.ts` | Success with sufficient inventory; fail loudly on insufficient GA/Core/NAT; empty inventory; usage cap |
| `shuffle.test.ts` | Deterministic reproducibility; different seeds → different results; no mutation; hash consistency |
| `palette.test.ts` | All state transitions: visit, mark toggle, clear, save & next; hasAnswer helper |

## 7. Applying Homepage Changes

The file `src/components/LearnamyteLanding.tsx.patch` contains a human-readable diff with 5 changes:

1. **Desktop nav**: Add "GATE Mocks" link before "Courses"
2. **Mobile nav**: Add "GATE Mocks" link at top
3. **Hero CTA**: Replace empty anchor with "Start Free GATE Demo" + "Explore Workshops"
4. **Products section**: New 3-card section before Features
5. **Footer**: Update Product links (replace `/workshops` with `/gate`, `/gate/demo`)

Apply each change by finding the marked code block and making the substitution.

## 8. Smoke Verification Checklist

### Homepage
- [ ] "GATE Mocks" link visible in desktop header nav (green text)
- [ ] "GATE Mocks" link visible in mobile hamburger menu
- [ ] "Start Free GATE Demo" primary CTA visible in hero
- [ ] "Explore Workshops" secondary CTA visible in hero
- [ ] Products section renders with 3 cards (GATE Mocks, Workshops, Certificates)
- [ ] Footer Product column includes "GATE Mocks" and "Free GATE Demo" links
- [ ] Existing features unchanged: Certificates, Corp, Brochure download still work

### GATE Pages
- [ ] `/gate` — Landing page renders with disclaimer
- [ ] `/gate/pricing` — Pricing page renders with 3 plans + disclaimer
- [ ] `/gate/demo` — Demo page loads (no auth required)

### Attempt Lifecycle
- [ ] `POST /api/gate/attempts/start` with `{"mode":"DEMO"}` returns 201 with attemptId
- [ ] Second demo start within 24h returns 429 (rate limited)
- [ ] `/gate/attempt/[attemptId]` — Simulator loads with palette, timer, question pane
- [ ] Palette colors match: Green=#00A86B, Red=#FF0000, White=#FFFFFF, Purple=#9932CC
- [ ] Zoom: Ctrl+= increases, Ctrl+- decreases, Ctrl+0 resets (question pane only)
- [ ] Question Paper modal opens showing all questions; clicking navigates
- [ ] `PUT /api/gate/attempts/[id]/heartbeat` returns 200 with serverTime
- [ ] `PUT /api/gate/attempts/[id]/answer` commits answer, returns paletteState
- [ ] `PUT /api/gate/attempts/[id]/mark` toggles mark, returns paletteState
- [ ] `PUT /api/gate/attempts/[id]/clear` resets to Not_Answered, clears mark
- [ ] Submit: double-confirm modal → `POST /api/gate/attempts/[id]/submit` returns 202
- [ ] Redirects to `/gate/report/[attemptId]` after submit

### Worker
- [ ] Worker starts: `[gate-worker] Starting event drain loop...` in logs
- [ ] Sweeper runs on startup: `[sweeper] Found 0 orphaned attempts`
- [ ] After submit: `gate.attempt_results` row appears in Postgres
- [ ] Orphan recovery: expired IN_PROGRESS attempt auto-finalized within 2 min
- [ ] Demo cleanup: expired demo attempts deleted

### Report
- [ ] `GET /api/gate/attempts/[id]/report` returns scores for authenticated user
- [ ] Returns 403 without active subscription
- [ ] Report page shows score, percent, pass/fail, per-question breakdown
- [ ] Errata banner appears when `adjusted_score` is present

### Payments
- [ ] `POST /api/webhooks/razorpay` with valid HMAC returns 200
- [ ] Duplicate event returns `{ok: true, deduped: true}`
- [ ] Invalid signature returns 401
- [ ] `subscription.activated` creates/updates `gate.subscriptions` row

### Security
- [ ] Authenticated user cannot start 2 concurrent attempts (409 on second start)
- [ ] User A cannot access User B's attempt (403)
- [ ] RLS validation queries all return 0

## 9. Assumptions Made

| Item | Assumption |
|------|------------|
| Node version | 20.x LTS — existing `.nvmrc`/`engines` NOT modified |
| Redis availability | Local Docker `redis://localhost:6379` for dev; ElastiCache for prod |
| Supabase CLI | Not required — migrations applied via psql or SQL Editor |
| Razorpay webhook events | `subscription.activated`, `subscription.charged`, `payment.failed` |
| S3 pre-signed URLs | Placeholder implementation; requires AWS SDK in production |
| Question content loading | Resume endpoint returns session state; question text/options loaded separately |
| Vitest | Added as new dev dependency; no existing test framework detected |
