# Evidence

One pasted proof per Definition-of-Done checkbox. A claim without evidence scores as **not done**.
Fill each block as you finish the feature — a test name + output, a curl transcript, or a log line.
Do not save this for the end.

> How to use: leave the `[ ]` unticked until you paste real proof, then tick `[x]`.

---

## Metering

- [ ] **A billable action creates exactly one usage event, even under retries — deduplicated by idempotency key.**
  ```
  <paste: two identical POST /api/generate calls with the same Idempotency-Key,
   then a SELECT COUNT(*) showing one row>
  ```

- [ ] **A test proves double-counting cannot happen.**
  ```
  <paste: test name + green output, e.g. meter.service.test.ts "records once under retry">
  ```

---

## Quotas

- [ ] **Usage is checked against the plan; requests over the limit are rejected.**
  ```
  <paste: curl at the boundary showing the request just over the limit is refused>
  ```

- [ ] **Responses carry the correct status codes (429 / 402) and a message explaining why.**
  ```
  <paste: HTTP response headers + JSON body showing 429 and a clear message>
  ```

---

## Cost calculation

- [ ] **Monthly usage rolls up into a cost figure per tenant.**
  ```
  <paste: GET /api/usage response with used / limit / cost>
  ```

- [ ] **AI token pricing handles cached input, reasoning, and output correctly.**
  ```
  <paste: pricing test output showing cached-input and reasoning rules applied>
  ```

- [ ] **Pricing constants are pinned and covered by tests.**
  ```
  <paste: pricing.config.test.ts green output>
  ```

---

## Stripe integration

- [ ] **Subscription checkout works end-to-end in Stripe test mode.**
  ```
  <paste: checkout session created + webhook flipping tenant Free -> Pro>
  ```

- [ ] **Webhooks verify signatures, ignore duplicate events, and update tenant plan/status.**
  ```
  <paste: forged signature -> 400; real event replayed twice -> processed once>
  ```

---

## Data model, tests & documentation

- [ ] **Database includes tenants, plans, subscriptions, and usage events; data isolated per tenant.**
  ```
  <paste: prisma migration / schema excerpt + a query proving tenant isolation>
  ```

- [ ] **Tests cover duplicate prevention, quota boundaries, cost calc, invalid & duplicate webhooks.**
  ```
  <paste: full test suite summary, all green>
  ```

- [ ] **README + architecture diagram + setup instructions present; submission-pack files present.**
  ```
  <this repo — README.md, capstone.yaml, EVIDENCE.md, BUILDLOG.md, .env.example>
  ```