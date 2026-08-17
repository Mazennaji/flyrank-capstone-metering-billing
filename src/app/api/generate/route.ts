import { NextResponse } from "next/server";
import { z } from "zod";
import { meterService } from "@/lib/services/meter.service";
import { resolveTenant } from "@/lib/services/auth.service";

const tokenSchema = z.object({
  input: z.number().int().nonnegative(),
  cached_input: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
  reasoning: z.number().int().nonnegative(),
});

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("api_call") }),
  z.object({ type: z.literal("ai_tokens"), tokens: tokenSchema }),
]);

export async function POST(request: Request) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "missing Idempotency-Key header" },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await meterService.record({
    tenantId: tenant.id,
    type: parsed.data.type,
    tokens: parsed.data.type === "ai_tokens" ? parsed.data.tokens : undefined,
    idempotencyKey,
  });

  return NextResponse.json(
    {
      event_id: result.eventId,
      cost_cents: result.costCents,
      quantity: Number(result.quantity),
      replayed: result.replayed,
    },
    { status: 200 },
  );
}