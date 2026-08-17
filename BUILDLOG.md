# Build Log

An honest record of where AI helped, where it was wrong, and what I changed.
Honesty is graded here, perfection is not. At the demo I may be asked to explain
2–3 lines the evaluator picks — "the AI wrote it" is not an answer, so this log
is also my own memory of *why* the code is the way it is.

Format: newest entry on top. One entry per working session.

---

## Template (copy for each session)

### YYYY-MM-DD — <what I worked on>

**Goal for the session:**
<one line>

**Where AI helped:**
- <e.g. scaffolded the Prisma schema from the design doc>

**Where AI was wrong or I disagreed:**
- <e.g. suggested check-then-insert for idempotency; I used a DB unique
  constraint instead because check-then-insert has a race condition>

**What I changed / decided myself:**
- <the actual engineering decisions I own>

**Gate reached:**
- <which Phase gate from the design doc, if any>

---

## 2026-__-__ — Project setup

**Goal for the session:**
Create the repo, README, design doc, and housekeeping files.

**Where AI helped:**
- Drafted README, design doc, and the submission-pack skeletons.

**Where AI was wrong or I disagreed:**
- <fill in as you review — e.g. any placeholder I had to correct>

**What I changed / decided myself:**
- Chose the all-TypeScript stack (Next.js + Prisma) over a mixed Node/Python
  split, to keep one runtime and one command to boot.
- Set the idempotency guarantee at the database layer.

**Gate reached:**
- Design doc signed off (Phase 1).