import { prisma } from "@/lib/db/client";

export async function resolveTenant(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const apiKey = header.slice("Bearer ".length).trim();
  if (!apiKey) return null;
  return prisma.tenant.findUnique({ where: { apiKey } });
}