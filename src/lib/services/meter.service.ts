import { UsageType } from "@prisma/client";
import { usageRepository } from "@/lib/repositories/usage.repository";
import { computeCost } from "@/lib/services/cost.service";
import type { TokenBreakdown } from "@/lib/config/pricing.config";

export type MeterInput = {
  tenantId: string;
  type: UsageType;
  tokens?: TokenBreakdown;
  idempotencyKey: string;
};

export type MeterResult = {
  eventId: string;
  costCents: number;
  quantity: bigint;
  replayed: boolean;
};

function resolveQuantity(type: UsageType, tokens?: TokenBreakdown): bigint {
  if (type === "api_call") return BigInt(1);
  if (!tokens) throw new Error("token breakdown required for ai_tokens");
  const total =
    tokens.input + tokens.cached_input + tokens.output + tokens.reasoning;
  return BigInt(total);
}

export const meterService = {
  async record(input: MeterInput): Promise<MeterResult> {
    const quantity = resolveQuantity(input.type, input.tokens);
    const costCents = computeCost(input.type, input.tokens);

    try {
      const event = await usageRepository.create({
        tenantId: input.tenantId,
        type: input.type,
        quantity,
        tokenBreakdown: input.tokens ?? null,
        costCents,
        idempotencyKey: input.idempotencyKey,
      });

      return {
        eventId: event.id,
        costCents: event.costCents,
        quantity: event.quantity,
        replayed: false,
      };
    } catch (error) {
      if (usageRepository.isUniqueViolation(error)) {
        const existing = await usageRepository.findByIdempotencyKey(
          input.tenantId,
          input.idempotencyKey,
        );
        if (existing) {
          return {
            eventId: existing.id,
            costCents: existing.costCents,
            quantity: existing.quantity,
            replayed: true,
          };
        }
      }
      throw error;
    }
  },
};