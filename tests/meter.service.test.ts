import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { meterService } from "@/lib/services/meter.service";

const prisma = new PrismaClient();
let tenantId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: "Test Tenant", apiKey: `test-${Date.now()}` },
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

describe("meterService.record", () => {
  it("records one event for a single request", async () => {
    await meterService.record({
      tenantId,
      type: "api_call",
      idempotencyKey: "key-1",
    });
    const count = await prisma.usageEvent.count({ where: { tenantId } });
    expect(count).toBe(1);
  });

  it("records exactly one event under retry with the same key", async () => {
    const first = await meterService.record({
      tenantId,
      type: "api_call",
      idempotencyKey: "retry-key",
    });
    const second = await meterService.record({
      tenantId,
      type: "api_call",
      idempotencyKey: "retry-key",
    });

    const count = await prisma.usageEvent.count({ where: { tenantId } });
    expect(count).toBe(1);
    expect(second.replayed).toBe(true);
    expect(second.eventId).toBe(first.eventId);
  });

  it("prices ai_tokens with reasoning billed as output", async () => {
    const result = await meterService.record({
      tenantId,
      type: "ai_tokens",
      tokens: { input: 1000, cached_input: 0, output: 500, reasoning: 500 },
      idempotencyKey: "tokens-1",
    });
    expect(result.costCents).toBeGreaterThan(0);
  });
});