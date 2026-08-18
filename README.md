# Usage Metering & Billing Engine

> A SaaS billing backend that meters usage, enforces quotas, calculates cost, and syncs Stripe subscriptions — **correct under retries, failures, and real-world conditions.**

[![Next.js](https://img.shields.io/badge/Next.js-App_Router-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Stripe](https://img.shields.io/badge/Stripe-Test_Mode-635BFF?logo=stripe&logoColor=white)](https://stripe.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## What this is

Every SaaS product has to answer three questions:

1. **How much has this customer used?**
2. **How much should they pay?**
3. **Have they hit their plan limit?**

This service answers all three. It meters every billable action, enforces subscription quotas, calculates cost (including the tricky AI-token pricing rules), and integrates Stripe in test mode with signature-verified, idempotent webhooks keeping plans in sync.

The scope is small on purpose — two plans, two usage types, one billable endpoint. The difficulty lives in **precision**, not size: a retry must not double-charge, a webhook that arrives twice must be processed once, and a customer exactly at their quota boundary must be handled exactly right.

---

## Features

**Usage metering.** Every billable action records a usage event attributed to a tenant. The same request with the same idempotency key produces exactly one event — retries never create duplicate charges.

**Quota enforcement.** Before an action is allowed, `current usage + requested usage` is checked against the plan limit. Over the limit, the API responds honestly: `429 Too Many Requests` for usage limits, `402 Payment Required` when the subscription is inactive — each with a clear message. Boundary rule: calls are allowed up to and including the limit; the call that would exceed it is rejected.

**Cost calculation.** Usage rolls up into money with real-world AI-token pricing: cached input tokens are cheaper, reasoning tokens are billed as output, and token categories are never simply added together. Money is stored in micro-cents internally and rounded to whole cents — never floats. Pricing constants are pinned and covered by tests.

**Stripe integration (test mode).** A Checkout flow creates subscriptions; a webhook handler verifies the signature, deduplicates events, and syncs the tenant's plan Free ↔ Pro. Payment truth lives at Stripe; the database mirrors it through verified events only.

---

## Plans

| Plan | API calls / month | AI tokens / month |
| --- | --- | --- |
| **Free** | 1,000 | 100,000 |
| **Pro** | 50,000 | 5,000,000 |

---

## Architecture

Clean, swappable layers — HTTP handling, business logic, and data access never bleed into each other. This is what lets the datasource swap from SQLite to PostgreSQL without touching a line of billing logic.

```
app/api/                  HTTP boundary — validate input, call a service, format the response
  generate/route.ts         POST a billable action
  usage/route.ts            GET the rollup: used / limit / cost
  checkout/route.ts         Create a Stripe Checkout session
  webhooks/stripe/route.ts  Stripe events (raw body -> verify -> dedupe -> sync)
  health/route.ts           Liveness + DB check

lib/services/             Business logic — pure, testable, framework-free
  meter.service.ts          Records usage; idempotency + quota gate
  quota.service.ts          Boundary checks and honest status codes
  cost.service.ts           Token pricing rules
  usage.service.ts          Monthly rollup
  subscription.service.ts   Plan sync + webhook dedupe
  auth.service.ts           Resolves a tenant from its API key

lib/repositories/         Data access — every query tenant-scoped
  usage.repository.ts
  plan.repository.ts

lib/config/
  pricing.config.ts         Pinned pricing constants (tested)
```

### Request flow

```
Client -> POST /api/generate
           |- validate payload (Zod)              bad input -> 400
           |- idempotency check                   retry? -> return original event
           |- quota check                         over limit -> 429 / 402 + message
           \- store usage_event + cost

GET /api/usage -> rollup(usage_events) -> { used, limit, cost } per type

Stripe Checkout (test mode) -> subscription created
Stripe -> signed webhook -> /api/webhooks/stripe
           |- verify signature                    forged -> 400
           |- deduplicate event                   replay -> ignored
           \- update tenant plan / status         Free <-> Pro
```

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router, Route Handlers) |
| Language | TypeScript |
| Validation | Zod |
| Database | SQLite (via Prisma) — provider-agnostic; PostgreSQL is a datasource swap |
| ORM / migrations | Prisma 6 |
| Payments | Stripe test mode + Stripe CLI |
| Testing | Vitest (isolated `test.db`) |

---

## Getting started

### Prerequisites

- Node.js 20+
- A free Stripe account in **test mode** (no card required)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook forwarding

### Run

```bash
git clone <your-repo-url>
cd flyrank-capstone-metering-billing
npm install

cp .env.example .env
# fill in your Stripe TEST keys (sk_test_..., price_..., pk_test_...)

npm run db:migrate      # creates dev.db (SQLite) + generates the Prisma client
npm run seed            # plan limits + a demo tenant near its quota
npm run dev             # http://localhost:3000
```

No Docker or database server needed — SQLite is a local file.

Verify it's up:

```bash
curl http://localhost:3000/api/health     # {"status":"ok","db":"connected"}
```

### Stripe webhooks (local)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_... into .env as STRIPE_WEBHOOK_SECRET, then restart npm run dev
```

### Test

```bash
npm test        # full suite, isolated from dev data
```

---

## Key endpoints

All requests authenticate with the tenant API key as a bearer token
(`Authorization: Bearer demo-tenant-key` after seeding).

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET`  | `/api/health` | Liveness + DB check |
| `POST` | `/api/generate` | Billable action — meters, quota-checks, prices (needs `Idempotency-Key`) |
| `GET`  | `/api/usage` | Rollup: used, limit, cost |
| `POST` | `/api/checkout` | Stripe test-mode Checkout session |
| `POST` | `/api/webhooks/stripe` | Verified Stripe event handler |

Example — a billable action:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer demo-tenant-key" \
  -H "Idempotency-Key: k1" \
  -H "Content-Type: application/json" \
  -d '{"type":"ai_tokens","tokens":{"input":1000,"cached_input":0,"output":500,"reasoning":500}}'
```

Send the same request again with the same `Idempotency-Key` and the response
comes back with `"replayed":true` and the same `event_id` — no second event.

---

## Testing philosophy

In billing, the tests are the product. The suite (17 tests) covers the cases that
cost money when they break: duplicate prevention, quota boundaries (under / at /
over), token pricing with pinned totals, and webhook dedupe + plan sync. Tests run
against an isolated `test.db` so they never mutate dev/demo data.

---

## Design decisions & limitations

**Idempotency is enforced by the database, not the application.** A UNIQUE
constraint on `(tenant_id, idempotency_key)` means a retry fails at insert time
and returns the original result — closing the race that a naive "check-first"
approach leaves open.

**Money is never a float.** Rates are micro-cents internally, rounded to whole
cents on read.

**Payment state is mirrored, never authored.** Stripe is the source of truth; the
database only reflects plan changes that arrive through signature-verified webhooks.

**SQLite by choice.** For zero-setup local runs. The layered architecture keeps the
datasource swappable — moving to PostgreSQL is a datasource change plus restoring
native enum/JSON types.

**Out of scope (by design):** invoicing, proration, and overage billing are stretch
goals. AI token counts are simulated — no model is called. Stripe runs in test mode
only.

---

## Project files

| File | Contents |
| --- | --- |
| `DESIGN.md` | The Phase 1 design doc: data model, API surface, idempotency strategy |
| `capstone.yaml` | Evaluator manifest: run, seed, test, base URL, endpoints |
| `EVIDENCE.md` | One pasted proof per definition-of-done item |
| `BUILDLOG.md` | Honest AI-usage log |
| `.env.example` | Every environment variable with safe placeholders |

---

## License

MIT — see [LICENSE](./LICENSE).