import { usageRepository } from "@/lib/repositories/usage.repository";
import { planRepository } from "@/lib/repositories/plan.repository";
import type { PlanName, UsageType } from "@/lib/types";

export type UsageSummary = {
  api_calls: { used: number; limit: number };
  ai_tokens: { used: number; limit: number };
  cost_cents: number;
};

export const usageService = {
  async summary(tenantId: string, plan: PlanName): Promise<UsageSummary> {
    const limits = await planRepository.getLimits(plan);
    const rows = await usageRepository.rollup(tenantId);

    const find = (type: UsageType) =>
      rows.find((r) => r.type === type) ?? {
        quantity: BigInt(0),
        costCents: 0,
      };

    const apiRow = find("api_call");
    const tokenRow = find("ai_tokens");

    return {
      api_calls: {
        used: Number(apiRow.quantity),
        limit: limits ? limits.apiCallLimit : 0,
      },
      ai_tokens: {
        used: Number(tokenRow.quantity),
        limit: limits ? Number(limits.aiTokenLimit) : 0,
      },
      cost_cents: Number(apiRow.costCents) + Number(tokenRow.costCents),
    };
  },
};