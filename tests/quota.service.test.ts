import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { meterService } from "@/lib/services/meter.service";

const prisma = new PrismaClient();
let tenantId: string;

beforeAll(async () => {
  await prisma.planLimit.upsert({
    where: { id: "free" },
    update: { apiCallLimit: 3, aiTokenLimit: BigInt(100000) },
    create: { id: "free", apiCallLimit: 3, aiTokenLimit: BigInt(100000) },
  });
  const tenant = await prisma.tenant.create({
    data: { name: "Quota Tenant", apiKey: `quota-${Date.now()}`, plan: "free" },
  });
  tenantId = tenant.id;
});

beforeEach(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId } });
});

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

async function call(key: string) {
  return meterService.record({
    tenantId,
    plan: "free",
    tenantStatus: "active",
    type: "api_call",
    idempotencyKey: key,
  });
}

describe("quota enforcement at the boundary", () => {
  it("allows calls up to the limit", async () => {
    expect((await call("a")).ok).toBe(true);
    expect((await call("b")).ok).toBe(true);
    expect((await call("c")).ok).toBe(true);
  });

  it("rejects the call that exceeds the limit with 429", async () => {
    await call("a");
    await call("b");
    await call("c");
    const over = await call("d");
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.decision.status).toBe(429);
  });

  it("returns 402 when the tenant is not active", async () => {
    const result = await meterService.record({
      tenantId,
      plan: "free",
      tenantStatus: "past_due",
      type: "api_call",
      idempotencyKey: "inactive",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.decision.status).toBe(402);
  });
});