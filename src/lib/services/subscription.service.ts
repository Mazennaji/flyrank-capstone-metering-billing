import { prisma } from "@/lib/db/client";
import type { PlanName } from "@/lib/types";

export const subscriptionService = {
  async alreadyProcessed(eventId: string): Promise<boolean> {
    const existing = await prisma.processedWebhookEvent.findUnique({
      where: { stripeEventId: eventId },
    });
    return existing !== null;
  },

  async markProcessed(eventId: string): Promise<void> {
    await prisma.processedWebhookEvent.create({
      data: { stripeEventId: eventId },
    });
  },

  async setPlanByCustomer(
    stripeCustomerId: string,
    plan: PlanName,
    status: string,
  ): Promise<void> {
    await prisma.tenant.updateMany({
      where: { stripeCustomerId },
      data: { plan, status },
    });
  },

  async linkCustomer(tenantId: string, stripeCustomerId: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId },
    });
  },
};