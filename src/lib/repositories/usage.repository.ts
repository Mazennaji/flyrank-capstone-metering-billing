import { prisma } from "@/lib/db/client";
import { Prisma, UsageType } from "@prisma/client";

export type CreateUsageEventInput = {
  tenantId: string;
  type: UsageType;
  quantity: bigint;
  tokenBreakdown: Prisma.InputJsonValue | null;
  costCents: number;
  idempotencyKey: string;
};

export const usageRepository = {
  async findByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return prisma.usageEvent.findUnique({
      where: {
        tenant_idempotency: { tenantId, idempotencyKey },
      },
    });
  },

  async create(input: CreateUsageEventInput) {
    return prisma.usageEvent.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        quantity: input.quantity,
        tokenBreakdown: input.tokenBreakdown ?? Prisma.JsonNull,
        costCents: input.costCents,
        idempotencyKey: input.idempotencyKey,
      },
    });
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
};