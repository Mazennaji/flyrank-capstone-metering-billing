export const TOKEN_RATES_MICROCENTS = {
  input: 30,
  cached_input: 8,
  output: 120,
  reasoning: 120,
} as const;

export const API_CALL_COST_CENTS = 1;

export type TokenBreakdown = {
  input: number;
  cached_input: number;
  output: number;
  reasoning: number;
};

export const PLAN_LIMITS = {
  free: { apiCallLimit: 1_000, aiTokenLimit: 100_000 },
  pro: { apiCallLimit: 50_000, aiTokenLimit: 5_000_000 },
} as const;