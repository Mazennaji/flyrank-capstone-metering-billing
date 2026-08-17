import { prisma } from "@/lib/db/client";
import type { PlanName } from "@/lib/types";

export const planRepository = {
  async getLimits(plan: PlanName) {
    return prisma.planLimit.findUnique({ where: { id: plan } });
  },
};