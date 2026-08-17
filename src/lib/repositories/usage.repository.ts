import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import type { UsageType } from "@/lib/types";

export type CreateUsageEventInput = {
  tenantId: string;
  type: UsageType;
  quantity: bigint;
  tokenBreakdown: string | null;
  costCents: number;
  idempotencyKey: string;
};

export const usageRepository = {
  async findByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return prisma.usageEvent.findUnique({
      where: { tenant_idempotency: { tenantId, idempotencyKey } },
    });
  },

  async create(input: CreateUsageEventInput) {
    return prisma.usageEvent.create({ data: input });
  },

  async sumQuantity(tenantId: string, type: UsageType) {
    const result = await prisma.usageEvent.aggregate({
      where: { tenantId, type },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? BigInt(0);
  },

  isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  },
  async rollup(tenantId: string) {
    const grouped = await prisma.usageEvent.groupBy({
      by: ["type"],
      where: { tenantId },
      _sum: { quantity: true, costCents: true },
    });
    return grouped.map((g) => ({
      type: g.type as UsageType,
      quantity: g._sum.quantity ?? BigInt(0),
      costCents: g._sum.costCents ?? 0,
    }));
  },
};