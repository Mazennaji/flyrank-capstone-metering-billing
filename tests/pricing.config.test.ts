import { describe, it, expect } from "vitest";
import { computeCost } from "@/lib/services/cost.service";
import { TOKEN_RATES_MICROCENTS } from "@/lib/config/pricing.config";

describe("cost calculation (pinned)", () => {
  it("charges a flat cent per api_call", () => {
    expect(computeCost("api_call")).toBe(1);
  });

  it("prices each token category at its own rate", () => {
    const cost = computeCost("ai_tokens", {
      input: 1000,
      cached_input: 0,
      output: 0,
      reasoning: 0,
    });
    expect(cost).toBe(Math.round((1000 * 30) / 1000));
  });

  it("prices cached input cheaper than fresh input", () => {
    const fresh = computeCost("ai_tokens", {
      input: 1000,
      cached_input: 0,
      output: 0,
      reasoning: 0,
    });
    const cached = computeCost("ai_tokens", {
      input: 0,
      cached_input: 1000,
      output: 0,
      reasoning: 0,
    });
    expect(cached).toBeLessThan(fresh);
  });

  it("bills reasoning tokens at the output rate", () => {
    const outputOnly = computeCost("ai_tokens", {
      input: 0,
      cached_input: 0,
      output: 1000,
      reasoning: 0,
    });
    const reasoningOnly = computeCost("ai_tokens", {
      input: 0,
      cached_input: 0,
      output: 0,
      reasoning: 1000,
    });
    expect(reasoningOnly).toBe(outputOnly);
    expect(TOKEN_RATES_MICROCENTS.reasoning).toBe(TOKEN_RATES_MICROCENTS.output);
  });

  it("computes a pinned total for a mixed breakdown", () => {
    const cost = computeCost("ai_tokens", {
      input: 1000,
      cached_input: 500,
      output: 800,
      reasoning: 200,
    });
    const expected = Math.round(
      (1000 * 30 + 500 * 8 + 800 * 120 + 200 * 120) / 1000,
    );
    expect(cost).toBe(expected);
  });

  it("does not naively sum token categories", () => {
    const total = 1000;
    const asAllInput = computeCost("ai_tokens", {
      input: total,
      cached_input: 0,
      output: 0,
      reasoning: 0,
    });
    const asAllOutput = computeCost("ai_tokens", {
      input: 0,
      cached_input: 0,
      output: total,
      reasoning: 0,
    });
    expect(asAllInput).not.toBe(asAllOutput);
  });
});