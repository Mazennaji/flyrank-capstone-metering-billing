import { usageRepository } from "@/lib/repositories/usage.repository";
import { planRepository } from "@/lib/repositories/plan.repository";
import type { PlanName, UsageType } from "@/lib/types";

export type QuotaDecision =
  | { allowed: true }
  | { allowed: false; status: 429 | 402; reason: string };

export const quotaService = {
  async check(
    tenantId: string,
    plan: PlanName,
    type: UsageType,
    requested: bigint,
    tenantStatus: string,
  ): Promise<QuotaDecision> {
    if (tenantStatus !== "active") {
      return {
        allowed: false,
        status: 402,
        reason: "subscription inactive; payment or upgrade required",
      };
    }

    const limits = await planRepository.getLimits(plan);
    if (!limits) {
      return {
        allowed: false,
        status: 402,
        reason: `no limits configured for plan ${plan}`,
      };
    }

    const limit =
      type === "api_call" ? BigInt(limits.apiCallLimit) : limits.aiTokenLimit;

    const used = await usageRepository.sumQuantity(tenantId, type);

    if (used + requested > limit) {
      return {
        allowed: false,
        status: 429,
        reason: `${type} quota exceeded: ${used}/${limit} used, ${requested} requested`,
      };
    }

    return { allowed: true };
  },
};