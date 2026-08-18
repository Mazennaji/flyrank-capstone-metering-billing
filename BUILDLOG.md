# Build Log

An honest record of where AI helped, where it was wrong, and what I changed.
Honesty is graded here, not perfection. Newest entry on top.

I used an AI assistant throughout to scaffold code, explain errors, and suggest
fixes. Every decision below I understood and applied myself; the log notes where
the AI's first suggestion was wrong for my environment and I had to change course.

---

## Stripe integration (step 6)

**Goal:** Checkout in test mode + a signature-verified, deduplicated webhook that
syncs a tenant Free → Pro.

**Where AI helped:**
- Drafted the Stripe client, checkout endpoint, webhook handler, and the
  subscription service (plan sync + dedupe via a processed_webhook_events table).
- Explained the Next.js App Router webhook gotcha: read the raw body with
  `await req.text()` before verifying the signature, never `req.json()`.

**Where it was wrong / what I had to fix myself:**
- The AI pinned an `apiVersion` string ("2025-08-27.basil") that my installed
  Stripe package rejected. I removed the version pin so it defaults to the
  library's version.
- A whole chain of Stripe config errors surfaced only at runtime, one at a time:
  missing business name, no active payment methods, and finally a live-vs-test
  mode mismatch. I fixed each: set the account name, added
  `payment_method_types: ["card"]` in code (so it doesn't depend on dashboard
  settings), and switched all keys/price/product to test mode.
- Mode-switch bug I hit and fixed: after switching from live to test keys,
  checkout failed with "No such customer ... exists in live mode but a test key
  was used." My tenant had a *live* stripeCustomerId stored from an earlier run.
  Lesson: the DB mirrors mode-specific Stripe objects, so switching modes orphans
  them. I reset the DB to clear the stale customer id.

**Decision I own:** the database only ever *mirrors* Stripe state, updated through
signature-verified webhook events — Stripe is the source of truth, never the app.

**Gate reached:** test Checkout flipped the tenant Free → Pro via the webhook;
GET /api/usage confirmed the Pro limits.

---

## Cost calculation & rollup (step 5)

**Where AI helped:** wrote the pinned pricing tests and the /api/usage rollup.

**What I decided:** store rates in micro-cents and round to whole cents on read,
so money never touches floating point. Pinned tests hard-code the expected cent
totals, so any accidental rate change breaks a test on purpose.

**Gate reached:** /api/usage numbers match the pinned tests; POST returned exactly
150 cents for a mixed token breakdown (reasoning billed as output).

---

## Test isolation fix

**Problem I found myself:** my quota test upserts the Free plan limit to 3 to test
the boundary. Because tests hit the same SQLite file as dev, that write leaked
into my real data — /api/usage started showing a Free limit of 3.

**Fix:** point tests at a separate `test.db` via a vitest setup file, and run
tests serially (SQLite dislikes parallel writers). Dev data stays clean now.

This is a real engineering-discipline lesson: tests must not mutate shared state.

---

## Metering & quotas (steps 3–4)

**Where AI helped:** wrote the meter service, quota service, repositories, and the
/api/generate route.

**Decision I own — idempotency at the database, not in code:** the AI initially
described a "check if it exists, then insert" approach. That has a race condition
(two concurrent retries both pass the check). I used a UNIQUE(tenant_id,
idempotency_key) constraint instead and catch the P2002 violation to return the
original event. Exactly-once, provable by test.

**Gate reached:** double-count test passes; boundary returns 429/402.

---

## Database & environment pivots (setup)

This is where most of my real time went, and none of it was the billing logic.

- **Prisma version churn:** `prisma init` pulled Prisma 7, which removed `url` from
  the schema and requires a driver adapter + prisma.config.ts. The AI's first
  fixes assumed different majors and conflicted. I pinned to Prisma 6 (current
  stable, matches all the tutorials) and kept the familiar `url = env(...)` setup.
- **Docker wouldn't run on my machine.** The brief and AI both assumed
  `docker compose up` for Postgres. It repeatedly failed to start. Rather than
  fight it, I switched the datasource to SQLite, which needs no server. Because
  the code is layered, this was a datasource change plus swapping Postgres enums
  for string fields (SQLite has no enums) and JSON for a stringified column.
- **Disk space (ENOSPC):** ran out of disk mid-build; cleared caches and temp
  files to continue. Noted here because it's part of the honest history.

**Decision I own:** SQLite for a zero-setup local run, with the architecture kept
provider-agnostic so PostgreSQL is a drop-in swap for a production demo.

---

## Project setup (step 0–2)

**Where AI helped:** scaffolded the repo, README, design doc, docker-compose,
Prisma schema, and the submission-pack files.

**Decisions I own:**
- All-TypeScript stack (Next.js App Router + Prisma) over a mixed Node/Python
  split, to keep one runtime and one command to boot.
- Generated the Next.js base myself with create-next-app (Path B) and integrated
  the scaffold files, so I understand every file in the repo.

**Gate reached:** design doc signed off; app boots; /api/health returns ok.