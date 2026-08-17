import { usageRepository } from "@/lib/repositories/usage.repository";
import { quotaService, type QuotaDecision } from "@/lib/services/quota.service";
import { computeCost } from "@/lib/services/cost.service";
import type { TokenBreakdown } from "@/lib/config/pricing.config";
import type { PlanName, UsageType } from "@/lib/types";

export type MeterInput = {
  tenantId: string;
  plan: PlanName;
  tenantStatus: string;
  type: UsageType;
  tokens?: TokenBreakdown;
  idempotencyKey: string;
};

export type MeterResult =
  | {
      ok: true;
      eventId: string;
      costCents: number;
      quantity: bigint;
      replayed: boolean;
    }
  | { ok: false; decision: Extract<QuotaDecision, { allowed: false }> };

function resolveQuantity(type: UsageType, tokens?: TokenBreakdown): bigint {
  if (type === "api_call") return BigInt(1);
  if (!tokens) throw new Error("token breakdown required for ai_tokens");
  return BigInt(
    tokens.input + tokens.cached_input + tokens.output + tokens.reasoning,
  );
}

export const meterService = {
  async record(input: MeterInput): Promise<MeterResult> {
    const quantity = resolveQuantity(input.type, input.tokens);

    const existing = await usageRepository.findByIdempotencyKey(
      input.tenantId,
      input.idempotencyKey,
    );
    if (existing) {
      return {
        ok: true,
        eventId: existing.id,
        costCents: existing.costCents,
        quantity: existing.quantity,
        replayed: true,
      };
    }

    const decision = await quotaService.check(
      input.tenantId,
      input.plan,
      input.type,
      quantity,
      input.tenantStatus,
    );
    if (!decision.allowed) {
      return { ok: false, decision };
    }

    const costCents = computeCost(input.type, input.tokens);

    try {
      const event = await usageRepository.create({
        tenantId: input.tenantId,
        type: input.type,
        quantity,
        tokenBreakdown: input.tokens ? JSON.stringify(input.tokens) : null,
        costCents,
        idempotencyKey: input.idempotencyKey,
      });
      return {
        ok: true,
        eventId: event.id,
        costCents: event.costCents,
        quantity: event.quantity,
        replayed: false,
      };
    } catch (error) {
      if (usageRepository.isUniqueViolation(error)) {
        const raced = await usageRepository.findByIdempotencyKey(
          input.tenantId,
          input.idempotencyKey,
        );
        if (raced) {
          return {
            ok: true,
            eventId: raced.id,
            costCents: raced.costCents,
            quantity: raced.quantity,
            replayed: true,
          };
        }
      }
      throw error;
    }
  },
};