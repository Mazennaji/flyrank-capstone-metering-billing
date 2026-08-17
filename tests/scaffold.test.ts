import { describe, it, expect } from "vitest";
import {
  TOKEN_RATES_MICROCENTS,
  PLAN_LIMITS,
} from "@/lib/config/pricing.config";

describe("scaffold", () => {
  it("loads pricing config", () => {
    expect(TOKEN_RATES_MICROCENTS.cached_input).toBeLessThan(
      TOKEN_RATES_MICROCENTS.input,
    );
    expect(TOKEN_RATES_MICROCENTS.reasoning).toBe(TOKEN_RATES_MICROCENTS.output);
  });

  it("has Pro limits higher than Free", () => {
    expect(PLAN_LIMITS.pro.apiCallLimit).toBeGreaterThan(
      PLAN_LIMITS.free.apiCallLimit,
    );
    expect(PLAN_LIMITS.pro.aiTokenLimit).toBeGreaterThan(
      PLAN_LIMITS.free.aiTokenLimit,
    );
  });
});