# Code review: Codex + Groq (3 Oct 2026)

How it was run (low token use): **Codex** read the repo itself (read-only, one prompt, max 20 verified findings).
**Groq** (gpt-oss-120b) got only the 24 highest-risk files (payments, attempts/scoring, auth/media/analytics) with
comments and blank lines stripped, in 7 batches of ~3k tokens (~23k input tokens total, under the 8k tokens/min cap).

## Verified by Claude (before acting)

| Claim | Source | Verdict | Status |
|---|---|---|---|
| Queued second plan locks the student out ("plan has not started yet") — `entitlements.ts` | Codex | **Confirmed** (1 account: the owner's) | **Fixed** 3 Oct (only started passes count) |
| Answers can be changed and regraded after submitting early (solutions visible) — `attempt-route.ts` | Codex | **Confirmed** | **Fixed** 3 Oct (`ATTEMPT_SUBMITTED` 409 on answer/clear/mark/heartbeat) |
| `checkout/verify` grants on signature without confirming capture | Codex | Plausible (depends on Razorpay auto-capture) | Open — fetch payment status before granting |
| Refund-before-grant / concurrent grants / fixed-date double orders race (`access.ts`) | Codex | Plausible (no transaction/lock) | Open — move grant/refund into a DB function with a lock |
| Refund webhook with empty notes ignored | Codex | Plausible | Open — resolve by stored provider payment/order id |
| Redis WATCH shared across requests (`redis.ts`) | Codex | Plausible | Open — per-transaction connection or Lua |
| Students can read solutions via direct Supabase queries if RLS policies are deployed | Codex | To check (depends on deployed grants) | Open |
| gate-worker uses `.from("gate.attempts")` | Codex | Worker is a separate Docker service, not on Vercel | Check whether it runs at all |
| Media route lets any signed-in user fetch any question image | Codex + Groq | Confirmed by design (images, not answers) | Low priority |
| No rate limits on subscribe / track / create-order | Codex + Groq | Confirmed | Open |
| Start route has no entitlement check | Groq | **False** (`checkEntitlement` at start/route.ts:115) | — |
| Verify replay grants multiple passes | Groq | **False** (grant is idempotent per payment order) | — |
| Submit accepted after time expiry | Groq | **False as a bug** (answers stop at `endsAt`; auto-submit at time-up is intended) | — |
| Auth callback lacks CSRF `state` | Groq | **False** (Supabase PKCE code exchange needs the verifier cookie) | — |
| Webhook signature compared as UTF-8 not hex | Groq | Harmless (both sides compared as the same hex string) | — |

## Codex findings (verbatim)

- **High — `src/lib/gate/attempt-route.ts:60`:** Submit early, read the report’s solutions, then call `answer` and `submit` again before `endsAt`: mutations never check `session.status`, and submission regrades already-submitted sessions. Require `IN_PROGRESS` for mutations and make finalized answer snapshots immutable.

- **High — `src/lib/gate/redis.ts:103`:** Concurrent requests share one Redis connection’s `WATCH` state; one request’s `EXEC` clears another’s watch, allowing stale writes to overwrite answers or restore an earlier session status. Use an isolated connection per transaction or Lua-based version comparison and update.

- **High — `db/gate/rls_policies.sql:119`:** With these policies deployed and table SELECT access granted, direct Supabase queries can read published question rows, including solution text and NAT answer bounds, without an attempt or paid entitlement. Remove student access to answer-bearing rows and expose only sanitized content through controlled endpoints or views.

- **High — `src/lib/gate/entitlements.ts:34`:** Buying a renewal creates a future pass with the latest expiry; this query selects that pass and rejects its future start, blocking tests and reports despite an existing current pass. Filter `starts_at <= now` before ordering and limiting.

- **High — `src/app/api/gate/checkout/verify/route.ts:66`:** A valid checkout signature immediately grants access without confirming capture; an authorized payment that never captures can therefore receive paid access. Fetch and validate payment status, order, amount and currency before granting, as distinguished in [Razorpay’s verification instructions](https://razorpay.com/docs/server-integration/python/test-app/).

- **High — `src/lib/gate/access.ts:104`:** If a refund arrives before the delayed capture grant, revocation finds no pass, then the grant ignores the order’s `REFUNDED` status and inserts active access; replaying verification also overwrites refunded orders as `CAPTURED`. Serialize grant/refund transitions in a database transaction and make refund state terminal.

- **High — `src/lib/gate/access.ts:138`:** Two different paid orders processed concurrently can read the same current expiry and create overlapping passes, losing one purchased duration. Lock the user’s entitlement chain while calculating and inserting each grant.

- **High — `src/lib/gate/access.ts:140`:** Create two fixed-date orders before paying either, then pay sequentially: the second grant starts at the first pass’s fixed end and ends at that same instant, producing zero-length access or an insertion failure after payment. Revalidate fixed-date purchases atomically and refund payments that can no longer add access.

- **High — `src/app/api/webhooks/razorpay/route.ts:149`:** A full-refund event with empty payment notes is permanently marked `IGNORED`, leaving access active; only order creation explicitly sets the local order ID in notes. Resolve refunds using persisted provider payment/order IDs, since [Razorpay refund payloads](https://razorpay.com/docs/webhooks/refunds/) can contain empty payment notes.

- **High — `services/gate-worker/src/sweeper.ts:23`:** The worker uses `.from("gate.attempts")` with a default-schema client, targeting a literal relation name rather than the `gate` schema; the same pattern breaks answer persistence and finalization throughout the worker. Use `.schema("gate").from("attempts")` consistently and handle database errors, otherwise disconnected students’ attempts remain active and block new tests.

- **Medium — `src/app/api/gate/attempts/[attemptId]/submit/route.ts:273`:** Repeated submissions delete and rebuild durable answer/score tables without a transaction; a failed retry can erase an already-valid report, and concurrent submissions can interleave deletes and inserts. Persist the complete report atomically under an attempt lock and return existing finalized results on retries.

- **Medium — `src/app/api/gate/attempts/[attemptId]/route.ts:95`:** A transient Redis read error is treated as session loss and permanently marks an in-progress database attempt `ABANDONED`, even when its Redis session still exists. Return a retryable outage response and reserve abandonment for confirmed, reconciled session loss.

- **Medium — `src/lib/gate/access.ts:233`:** Refund processing ends the refunded pass before shifting later passes, then ignores failures during those shifts; retries skip the already-ended pass, leaving the purchased access chain permanently inconsistent. Perform revocation and all dependent shifts in one transaction and propagate every error.

- **Medium — `src/app/api/gate/checkout/create-order/route.ts:124`:** If persisting `provider_order_id` fails, checkout still returns a payable Razorpay order; the customer can pay but verification subsequently rejects the order-ID mismatch. Check persistence before returning checkout details and provide a durable reconciliation path.

- **Medium — `src/app/api/gate/media/[...filename]/route.ts:85`:** Any signed-in account—or guest with one recent demo—can retrieve arbitrary valid object keys from the private question-media bucket, including media unrelated to its permitted questions. Authorize each key against accessible question content or require a server-issued signature scoped to that key.

- **Medium — `src/app/api/gate/attempts/[attemptId]/submit/route.ts:212`:** An MCQ/MSQ marked `MARKS_TO_ALL` with no correct options makes submission fail before the scoring engine can award its unconditional marks. Exempt these questions from the correct-option requirement.

- **Medium — `src/app/api/gate/errata/publish/route.ts:48`:** An SME can supply another question’s version or a version outside `PENDING_REVIEW`; the route publishes it and creates a mismatched errata event, while ignoring write failures. Validate question identity and review state, then publish the version, event and report atomically.

- **Medium — `src/app/api/subscribe/route.ts:3`, `src/app/api/track/route.ts:42`, `src/app/api/gate/checkout/create-order/route.ts:20`:** Unthrottled callers can subscribe arbitrary addresses, flood analytics with a browser user-agent, or create unlimited payment orders using one account. Add distributed per-IP/account limits and use confirmed opt-in for subscriptions.

- No additional verified issues found in the inspected auth redirect, client secret exposure, signed public-media validation, or `unstable_cache` key isolation.

## Groq findings (verbatim; batches 1 and 6 re-run after empty replies)

#### Batch 1 (rerun): src/app/api/gate/checkout/create-order/route.ts, src/app/api/gate/checkout/verify/route.ts, src/app/api/webhooks/razorpay/route.ts

**Security / Money / Integrity bugs**

| Severity | File & approx. line | Failure scenario | Fix |
|----------|---------------------|-------------------|-----|
| **Critical** | `src/app/api/gate/checkout/verify/route.ts` ≈ 30 | The verification endpoint grants access **without checking the order’s current status** or marking it as processed. An attacker can replay a valid payload (or a captured webhook) and receive multiple access passes / extend the subscription. | 1. Fetch `payment_orders.status` and only continue if it is `"CREATED"` (or similar). <br>2. Update the row to `"PAID"` (or `"PROCESSED"`) **in the same transaction** before calling `grantAccessForPaidOrder`. <br>3. Make `grantAccessForPaidOrder` idempotent (e.g., up‑sert on a unique `payment_order_id`). |
| **High** | `src/app/api/gate/checkout/create-order/route.ts` ≈ 55‑70 | A user can fire the *create‑order* endpoint repeatedly, creating many `payment_orders` for the same plan before any payment is made. This can lead to duplicate charges and, if the user later pays any of them, multiple grants of the same plan. | Enforce a **single pending order per user + plan** (e.g., add a unique index on `(user_id, plan_id, status='CREATED')`) or require an idempotency key from the client and reject duplicate requests. |
| **Medium** | `src/app/api/webhooks/razorpay/route.ts` ≈ 120 | The webhook handler grants access based only on the `payment_order_id` stored in Razorpay notes. It never verifies that the **payment amount** in the webhook matches the amount stored in `payment_orders`. A malicious (or mis‑configured) webhook could grant a plan for a lower‑priced payment. | After extracting `event.payload.payment.entity.amount`, compare it with `payment_orders.amount_inr * 100` (paise). Abort and log if they differ. |
| **Medium** | `src/app/api/webhooks/razorpay/route.ts` ≈ 90‑110 | Two concurrent deliveries of the same Razorpay event can both pass the “not processed yet” check, insert the event (unique‑violation handled) and **both execute the grant/revoke logic**, potentially creating duplicate access records. | Perform the whole processing inside a **single DB transaction** that atomically: <br>1. Checks/sets the event status to `"PROCESSING"`; <br>2. Executes the business logic; <br>3. Updates the status to `"PROCESSED"` (or `"FAILED"`). This guarantees only one worker proceeds. |
| **Low** | `src/app/api/gate/checkout/create-order/route.ts` ≈ 20 | The endpoint returns detailed internal errors (`console.error`) and the raw Supabase error messages to the client in some paths, leaking implementation details. | Replace raw error messages with generic ones for the client; keep detailed logs server‑side only. |
| **Low** | `src/app/api/webhooks/razorpay/route.ts` ≈ 30‑40 | The webhook signature verification uses `Buffer.from(signature)` directly, which may treat a hex string as UTF‑8 bytes, potentially allowing mismatched lengths to pass timing‑safe compare on some runtimes. | Ensure the incoming signature is decoded from hex (`Buffer.from(signature, 'hex')`) before comparison. |

If none of the above applied, the answer would be “No serious issues found.”

#### Batch 2: src/lib/gate/access.ts, src/lib/gate/razorpay.ts, src/lib/gate/plan-price.ts, src/lib/gate/entitlements.ts, src/lib/gate/attempt-route.ts

**Security / Money / Integrity bugs found**

| Severity | File & Approx. Line | Failure scenario | Fix |
|----------|---------------------|-------------------|-----|
| **Critical** | `src/lib/gate/access.ts` – `grantAccessForPaidOrder` (≈ line 45) | The function grants an **ACTIVE** access pass for any `paymentOrderId` without first checking that the order is actually paid/captured. An attacker who can guess or supply an arbitrary order ID can obtain a free pass. | Verify the payment order’s status (e.g., `status === "CAPTURED"` or `"PAID"`) **before** creating/updating the access pass. Return an error if the order is not in a paid state. |
| **High** | `src/lib/gate/access.ts` – `revokeAccessForRefundedOrder` (≈ line 90) | The refund routine updates the order, the affected pass, and all later passes **outside of a transaction**. If two refunds run concurrently the DB can end up with partially applied changes (e.g., overlapping `starts_at`/`ends_at`). | Wrap the whole sequence in a single database transaction (or use Supabase’s `rpc`/`transaction` support) so that either all updates succeed or none do. |
| **High** | `src/lib/gate/access.ts` – `revokeAccessForRefundedOrder` (≈ line 115‑124) | Updates of “later” passes are performed with `await db.from(...).update(...).eq(...);` but the

#### Batch 3: src/app/api/gate/attempts/start/route.ts

**Security / Integrity bugs found**

| Severity | File & Approx. Line | Failure scenario | Fix |
|----------|--------------------|------------------|-----|
| **Critical** | `src/app/api/gate/attempts/start/route.ts:≈120` | **Missing test‑access authorization** – After the user is authenticated the code only checks that the test is active and that the mode matches. It never verifies that the user’s subscription / access tier permits the requested `testVersionId`. An attacker who knows a valid UUID can start any restricted test (e.g., paid “RANKED” exams) and obtain its questions. | Add a check that the user (or guest token) is entitled to the test’s `access_tier`. Query the `test_versions` row’s `access_tier` and compare it with the user’s plan, returning 403 if not allowed. |
| **High** | `src/app/api/gate/attempts/start/route.ts:≈150` | **Race condition on `max_attempts_per_user`** –

#### Batch 4: src/app/api/gate/attempts/[attemptId]/submit/route.ts, src/app/api/gate/attempts/[attemptId]/answer/route.ts, src/app/api/gate/attempts/[attemptId]/heartbeat/route.ts

**Real bugs found (max 6)**  

| Severity | File & Approx. Line | Failure scenario | Recommended fix |
|----------|---------------------|-------------------|-----------------|
| **Critical** | `src/app/api/gate/attempts/[attemptId]/submit/route.ts` (status check before grading) | The handler never checks the attempt’s expiry time. A user can call **POST /submit** after the exam window has closed and still receive a valid score. | Add a server‑side check `if (now > new Date(session.endsAt)) return Response.json({error: "ATTEMPT_EXPIRED"}, {status: 409});` (or reject any status other than `IN_PROGRESS`). |
| **High** | `src/app/api/gate/attempts/[attemptId]/submit/route.ts` (atomicUpdateSession block) | The route is not idempotent. A second concurrent **POST** on the same attempt (or a replay) will re‑grade the attempt, delete/insert answer rows again and may overwrite results inconsistently. | Make the update conditional on `session.status === "IN_PROGRESS"` and return `409` otherwise. Wrap the whole grading + DB persistence in a single transaction (Supabase `rpc` or `transaction

#### Batch 5: src/lib/gate/scoring.ts, src/lib/gate/nat.ts, src/lib/gate/redis.ts, src/lib/gate/demo.ts

**No serious issues found.**

#### Batch 6 (rerun): src/app/api/gate/media/[...filename]/route.ts, src/app/gate/papers/media/[sig]/[...key]/route.ts, src/app/api/track/route.ts, src/lib/admin/guard.ts, src/app/api/gate/practice/topic/route.ts, src/app/gate/auth/callback/route.ts

**Security / integrity bugs found**

| Severity | File & approx. line | Failure scenario | Fix |
|----------|---------------------|------------------|-----|
| **Critical** | `src/app/gate/auth/callback/route.ts` (safeNext) | OAuth callback does **not verify a CSRF state token**. An attacker can craft a link to the callback with a valid `code` and a malicious `next` URL, forcing the victim to complete the login flow and be redirected to an attacker‑controlled page. | Generate a random `state` value when initiating the auth request, store it (e.g., in a http‑only cookie or server session), and require the same `state` parameter in the callback before exchanging the code. |
| **High** | `src/app/api/gate/media/[...filename]/route.ts` (authorizeMediaAccess) | Guest users are authorized solely by the presence of a recent `guest_token`. The code does **not check that the requested media file belongs to the guest’s attempt**, so any demo user can fetch arbitrary media (IDOR). | Associate each media object with the attempt (e.g., store allowed `objectKey`s in the `attempts` table) and, after retrieving the attempt, verify that `objectKey` is permitted for that attempt before returning the file. |
| **Medium** | `src/app/api/track/route.ts` (rows mapping) | The endpoint trusts client‑provided `visitor_id` and `session_id`. An attacker can spoof these values to pollute analytics, infer usage patterns of other users, or trigger rate‑limit bypasses. | Generate `visitor_id`/`session_id` server‑side (e.g., from a signed cookie) and ignore any values supplied by the client, or at least validate them against a server‑maintained store. |
| **Medium** | `src/app/api/gate/practice/topic/route.ts` (pickOrCreateBlueprint) | Two concurrent requests with the same `durationSeconds` can both miss the initial `select` and then both insert, creating duplicate blueprint rows (race condition). | Use an **upsert** (`.upsert(...)` with `onConflict`) or enforce a unique constraint on `duration_seconds` and handle the conflict, ensuring only one row is created. |
| **Low** | `src/app/api/gate/practice/topic/route.ts` (test_version insert → tvq insert) | The creation of a `test_version` and its associated `test_version_questions` is not wrapped in a transaction. If the second insert fails, the first row may remain, leaving inconsistent data. | Perform both inserts inside a single transaction (e.g., using Supabase RPC or `supabase.from(...).insert(...).select().single()` followed by a transaction block) and roll back on any error. |
| **Low** | `src/app/api/gate/media/[...filename]/route.ts` (Content‑Disposition header) | `downloadName` is taken directly from the URL path and placed inside `Content‑Disposition`. Although the filename regex blocks quotes, other special characters could still break the header or be used for header injection. | Encode the filename (e.g., `encodeURIComponent`) or use `Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}` to ensure safe header values. |

*If no other critical issues are present, these are the only serious bugs identified.*

#### Batch 7: src/app/api/gate/attempts/[attemptId]/report/route.ts, src/app/api/gate/me/access/route.ts

**Security / Integrity Issues Found**

| Severity | File & Approx. Line | Failure Scenario | Fix |
|----------|---------------------|------------------|-----|
| **High** | `src/app/api/gate/attempts/[attemptId]/report/route.ts` – around line 150 (`.in("id", idsForQuestionLoad)`) | If a test version contains **no questions**, `idsForQuestionLoad` becomes an empty array. Supabase treats an empty `in` filter as an error, causing a 500 response that leaks internal error details and can be used for a denial‑of‑service on the report endpoint. | Guard against an empty list before calling Supabase. If the list is empty, return a 204/404 with a friendly message or skip the query entirely. Example: ```ts if (idsForQuestionLoad.length === 0) { return Response.json({ error: "No questions found for this attempt" }, { status: 404 }); }``` |
| **Medium** | `src/app/api/gate/me/access/route.ts` – line 22 (`await supabaseAdmin.schema("gate").from("plans")...`) | The query to fetch the plan **ignores possible errors** (`error` field is never checked). If the DB call fails, the handler still returns a 200 response with `plan: null`, masking the failure and making debugging harder; in some edge cases it could also expose a partially‑filled object. | Capture and handle the error explicitly. Return a 500 with a generic message if the query fails, e.g.: ```ts const { data: p, error: planErr } = await supabaseAdmin...; if (planErr) { console.error(planErr); return Response.json({ signedIn: true, hasPlan: false, name, plan: null }, { status: 500 }); }``` |
| **Low** | `src/app/api/gate/attempts/[attemptId]/report/route.ts` – line 30 (`if (!allowed) { … }`) | The `isAuthorizedActor` check is performed **before** the demo‑mode entitlement check. If `isAuthorizedActor` mistakenly grants access (e.g., a malformed `demoCookie`), a user could view a demo attempt report without proper demo credentials. | Ensure `isAuthorizedActor` validates the `demoCookie` strictly (constant‑time compare, proper signature verification). Add an extra guard after the demo‑mode block: ```ts if (attempt.mode === "DEMO" && !demoCookieIsValid) { return Response.json({ error: "FORBIDDEN" }, { status: 403 }); }``` |
| **Low** | `src/app/api/gate/attempts/[attemptId]/report/route.ts` – line 85 (`if (attempt.status !== "SUBMITTED") { … }`) | The generic 400 error for unsupported statuses could leak internal state (`attempt.status`) to a client that may not be authorized to see it. | Return a generic message without echoing the

