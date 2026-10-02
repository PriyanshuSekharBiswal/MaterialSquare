import { Prisma } from "@prisma/client";

export async function expireCustomerLoyaltyPoints(
  tx: Prisma.TransactionClient,
  customerId: string,
) {
  const expired = await tx.loyaltyTransaction.findMany({
    where: {
      customerId,
      points: { gt: 0 },
      isExpired: false,
      expiresAt: { lte: new Date() },
    },
    select: { id: true, accountId: true, points: true, description: true },
  });
  for (const entry of expired) {
    const claimed = await tx.loyaltyTransaction.updateMany({
      where: { id: entry.id, isExpired: false },
      data: { isExpired: true },
    });
    if (!claimed.count) continue;
    const account = await tx.loyaltyAccount.findUnique({ where: { id: entry.accountId } });
    if (!account) continue;
    const expiredPoints = Math.min(account.pointsBalance, entry.points);
    if (expiredPoints <= 0) continue;
    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: { pointsBalance: { decrement: expiredPoints } },
    });
    await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        customerId,
        type: "EXPIRE",
        points: -expiredPoints,
        description: `Expired: ${entry.description}`,
      },
    });
  }
}
