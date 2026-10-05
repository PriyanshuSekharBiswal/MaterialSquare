import { Prisma } from "@prisma/client";

export async function creditDeliveredOrderLoyalty(
  db: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const settings = await db.loyaltyProgramSetting.findUnique({
    where: { id: "default" },
  });
  if (!settings?.enabled || settings.pointsPer100Inr.lte(0)) return;
  if (order.grandTotal.lt(settings.minimumOrderValueInr)) return;
  const alreadyEarned = await db.loyaltyTransaction.findFirst({
    where: { orderId, type: "EARN" },
  });
  if (alreadyEarned) return;
  const points = order.grandTotal
    .div(100)
    .mul(settings.pointsPer100Inr)
    .floor()
    .toNumber();
  if (points <= 0) return;
  const account = await db.loyaltyAccount.upsert({
    where: { customerId: order.customerId },
    create: { customerId: order.customerId, pointsBalance: points },
    update: { pointsBalance: { increment: points } },
  });
  const expiresAt = settings.expiryAfterDays
    ? new Date(Date.now() + settings.expiryAfterDays * 86400000)
    : null;
  await db.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      customerId: order.customerId,
      orderId,
      type: "EARN",
      points,
      description: `Points earned for delivered order ${order.orderNumber}`,
      expiresAt,
    },
  });
}
