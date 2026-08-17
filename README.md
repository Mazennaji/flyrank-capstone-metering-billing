# Usage Metering & Billing Engine

> A SaaS billing backend that meters usage, enforces quotas, calculates cost, and syncs Stripe subscriptions — **correct under retries, failures, and real-world conditions.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-App_Router-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Stripe](https://img.shields.io/badge/Stripe-Test_Mode-635BFF?logo=stripe&logoColor=white)](https://stripe.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## What this is

Every SaaS product on earth has to answer three questions:

1. **How much has this customer used?**
2. **How much should they pay?**
3. **Have they hit their plan limit?**

This service answers all three. It meters every billable action, enforces subscription quotas, calculates cost (including the genuinely tricky AI-token pricing rules), and integrates Stripe in test mode with signature-verified, idempotent webhooks keeping plans in sync.

The scope is small on purpose — two plans, two usage types, one billable endpoint. The difficulty lives in **precision**, not size: a retry must not double-charge, a webhook that arrives twice must be processed once, and a customer sitting exactly at their quota boundary must be handled exactly right. These are the bugs that cost real companies real money.

---

## Why it matters

| Failure mode | What it costs | How this service prevents it |
| --- | --- | --- |
| A retried request records usage twice | Customers get overcharged | Database-enforced idempotency keys — exactly-once, provable by test |
| A quota check is off by one | Revenue leak, or angry customers | Boundary logic tested at *under*, *at*, and *over* the limit |
| Token categories summed naively | Wrong invoices | Pricing rules encoded in config, pinned with tests |
| A forged or replayed webhook | Corrupted plan state | Signature verification first; duplicate events ignored |

---

## Features

**Usage metering.** Every billable action records a usage event attributed to a tenant. The same request with the same idempotency key produces exactly one event — retries never create duplicate charges.

**Quota enforcement.** Before an action is allowed, `current usage + requested usage` is checked against the plan limit. Over the limit, the API responds honestly: `429 Too Many Requests` for usage limits, `402 Payment Required` when an upgrade is needed — each with a clear, machine-readable message.

**Cost calculation.** Usage rolls up into money with real-world AI-token pricing: cached input tokens are cheaper, reasoning tokens count as output, and token categories are never simply added together. Money is stored as integer cents, never floats. Pricing constants are pinned and covered by tests.

**Stripe integration (test mode).** A Checkout flow creates subscriptions; a webhook handler for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` verifies the signature, deduplicates events, and syncs the tenant's plan. Payment truth lives at Stripe; the database mirrors it through verified events only.

---

## Plans

| Plan | API calls / month | AI tokens / month |
| --- | --- | --- |
| **Free** | 1,000 | 100,000 |
| **Pro** | Higher limits | Higher limits |

---

## Architecture

The system is built in clean, swappable layers — HTTP handling, business logic, and data access never bleed into each other. This is what lets you swap Postgres or the payment provider without touching a single line of billing logic.

```
app/api/                  HTTP boundary — validate input, call a service, format the response
  generate/route.ts         POST a billable action
  usage/route.ts            GET the rollup: used / limit / cost
  webhooks/stripe/route.ts  Stripe events (raw body → verify → sync)

lib/services/             Business logic — pure, testable, no framework
  meter.service.ts          Records usage; idempotency lives here
  quota.service.ts          Boundary checks and honest status codes
  cost.service.ts           Token pricing rules and rollups
  stripe.service.ts         Checkout + webhook plan synchronization

lib/repositories/         Data access — every query, tenant-isolated
  usage.repository.ts
  tenant.repository.ts

lib/config/
  pricing.config.ts         Pinned pricing constants (tested)
```

### Request flow

```
Client → POST /api/generate
           │
           ├─ validate payload (Zod)           bad input → 400
           ├─ MeterService.record(idempotencyKey)
           │     duplicate key? → return the original result, no new event
           ├─ QuotaService.check()             over limit → 429 / 402 + message
           ├─ store usage_event
           └─ CostService — usage rolled into cost on read

GET /api/usage → rollup(usage_events) → { used, limit, cost }

Stripe Checkout (test mode) → subscription created
Stripe → signed webhook → /api/webhooks/stripe
           ├─ verify signature               forged → 400
           ├─ deduplicate event              replay → ignored
           └─ update tenant plan / status
```

---

## Tech stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router, Route Handlers) | Whole backend in typed route handlers |
| Language | TypeScript | Type safety where money math must not slip |
| Validation | Zod | Every request validated at the boundary |
| Database | PostgreSQL (Docker) | Real `UNIQUE` constraints enforce exactly-once metering |
| ORM / migrations | Prisma | Type-safe queries, schema as migrations |
| Payments | Stripe test mode + Stripe CLI | Free, no card, no real money |
| Testing | Vitest | The tests are the product in billing |

---

## Getting started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for local webhook forwarding)
- A free Stripe account (test mode — no card required)

### Run

```bash
# 1. Clone and install
git clone https://github.com/<you>/flyrank-capstone-metering-billing.git
cd flyrank-capstone-metering-billing
npm install

# 2. Configure environment
cp .env.example .env
# fill in your Stripe test keys (see .env.example for each variable)

# 3. Boot the database and app
docker compose up -d        # PostgreSQL
npm run db:migrate          # apply schema
npm run seed                # demo tenant, plans, a tenant near its quota
npm run dev                 # start the server
```

### Forward Stripe webhooks locally

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_... into your .env as STRIPE_WEBHOOK_SECRET
```

### Test

```bash
npm test                    # full suite, including the scary cases
```

---

## Key endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/generate` | A billable action — records usage, checks quota, returns cost |
| `GET`  | `/api/usage` | Rollup for the tenant: used, limit, cost |
| `POST` | `/api/checkout` | Create a Stripe test-mode Checkout session |
| `POST` | `/api/webhooks/stripe` | Verified Stripe event handler |

Metering requests accept an `Idempotency-Key` header. Sending the same key twice returns the original result and records exactly one usage event.

---

## Testing philosophy

In billing, the tests *are* the product. The suite covers the cases that cost money when they break:

- **Duplicate prevention** — same idempotency key twice produces one usage event.
- **Quota boundaries** — behavior tested just under, exactly at, and just over the limit.
- **Cost calculations** — cached-input and reasoning-token rules produce exact, pinned totals.
- **Webhook security** — a forged signature is rejected with `400`; a replayed event is processed once.

---

## Design decisions & limitations

**Idempotency is enforced by the database, not the application.** A `UNIQUE` constraint on the idempotency key means a retry fails at insert time and returns the original result — this closes the race condition that a naive "check if it exists first" approach leaves open.

**Money is stored as integer cents.** Floating-point arithmetic silently corrupts financial totals; integers do not.

**Payment state is mirrored, never authored.** Stripe is the source of truth. The database only ever reflects plan changes that arrive through signature-verified webhook events.

**Out of scope (by design):** invoicing, proration, and overage billing are stretch goals, not core. AI token counts are simulated — no model is called and no AI key is needed. Stripe runs in test mode only; live mode is never enabled.

---

## Project files

| File | Contents |
| --- | --- |
| `capstone.yaml` | Evaluator manifest: run, seed, test, base URL, endpoints to probe |
| `EVIDENCE.md` | One pasted proof per definition-of-done item |
| `BUILDLOG.md` | Honest AI-usage log: where it helped, where it was wrong, what changed |
| `.env.example` | Every environment variable with safe placeholder values |

---

## License

MIT — see [LICENSE](./LICENSE).
