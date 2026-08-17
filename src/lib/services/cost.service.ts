import { UsageType } from "@prisma/client";
import {
  TOKEN_RATES_MICROCENTS,
  API_CALL_COST_CENTS,
  type TokenBreakdown,
} from "@/lib/config/pricing.config";

export function computeCost(type: UsageType, tokens?: TokenBreakdown): number {
  if (type === "api_call") return API_CALL_COST_CENTS;
  if (!tokens) throw new Error("token breakdown required for ai_tokens");

  const microcents =
    tokens.input * TOKEN_RATES_MICROCENTS.input +
    tokens.cached_input * TOKEN_RATES_MICROCENTS.cached_input +
    tokens.output * TOKEN_RATES_MICROCENTS.output +
    tokens.reasoning * TOKEN_RATES_MICROCENTS.reasoning;

  return Math.round(microcents / 1000);
}