import { PrismaClient, Plan } from "@prisma/client";
import { PLAN_LIMITS } from "../src/lib/config/pricing.config";

const prisma = new PrismaClient();

async function main() {
  await prisma.planLimit.upsert({
    where: { id: Plan.free },
    update: {
      apiCallLimit: PLAN_LIMITS.free.apiCallLimit,
      aiTokenLimit: BigInt(PLAN_LIMITS.free.aiTokenLimit),
    },
    create: {
      id: Plan.free,
      apiCallLimit: PLAN_LIMITS.free.apiCallLimit,
      aiTokenLimit: BigInt(PLAN_LIMITS.free.aiTokenLimit),
    },
  });

  await prisma.planLimit.upsert({
    where: { id: Plan.pro },
    update: {
      apiCallLimit: PLAN_LIMITS.pro.apiCallLimit,
      aiTokenLimit: BigInt(PLAN_LIMITS.pro.aiTokenLimit),
    },
    create: {
      id: Plan.pro,
      apiCallLimit: PLAN_LIMITS.pro.apiCallLimit,
      aiTokenLimit: BigInt(PLAN_LIMITS.pro.aiTokenLimit),
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { apiKey: "demo-tenant-key" },
    update: {},
    create: {
      name: "Demo Tenant",
      apiKey: "demo-tenant-key",
      plan: Plan.free,
    },
  });

  const already = await prisma.usageEvent.count({
    where: { tenantId: tenant.id, type: "api_call" },
  });

  if (already === 0) {
    const events = Array.from({ length: 990 }, (_, i) => ({
      tenantId: tenant.id,
      type: "api_call" as const,
      quantity: BigInt(1),
      costCents: 1,
      idempotencyKey: `seed-api-${i}`,
    }));
    await prisma.usageEvent.createMany({ data: events });
  }

  console.log(`Seeded. Demo tenant id: ${tenant.id} (apiKey: demo-tenant-key)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });