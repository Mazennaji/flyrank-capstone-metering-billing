import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { subscriptionService } from "@/lib/services/subscription.service";

const prisma = new PrismaClient();
let tenantId: string;
const customerId = `cus_test_${Date.now()}`;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      name: "Sub Tenant",
      apiKey: `sub-${Date.now()}`,
      plan: "free",
      stripeCustomerId: customerId,
    },
  });
  tenantId = tenant.id;
});

afterAll(async () => {
  await prisma.processedWebhookEvent.deleteMany({});
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("subscriptionService", () => {
  it("upgrades a tenant to pro by customer id", async () => {
    await subscriptionService.setPlanByCustomer(customerId, "pro", "active");
    const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
    expect(t?.plan).toBe("pro");
    expect(t?.status).toBe("active");
  });

  it("deduplicates processed events", async () => {
    const eventId = `evt_${Date.now()}`;
    expect(await subscriptionService.alreadyProcessed(eventId)).toBe(false);
    await subscriptionService.markProcessed(eventId);
    expect(await subscriptionService.alreadyProcessed(eventId)).toBe(true);
  });

  it("downgrades to free on cancellation", async () => {
    await subscriptionService.setPlanByCustomer(customerId, "free", "canceled");
    const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
    expect(t?.plan).toBe("free");
    expect(t?.status).toBe("canceled");
  });
});