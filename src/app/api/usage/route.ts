import { NextResponse } from "next/server";
import { usageService } from "@/lib/services/usage.service";
import { resolveTenant } from "@/lib/services/auth.service";
import type { PlanName } from "@/lib/types";

export async function GET(request: Request) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await usageService.summary(
    tenant.id,
    tenant.plan as PlanName,
  );

  return NextResponse.json(summary, { status: 200 });
}