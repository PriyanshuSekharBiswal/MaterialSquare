import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";

export async function authenticateDemoCustomer(page: Page, phone: string) {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl)
    throw new Error("TEST_DATABASE_URL is required for demo browser tests");

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const sessionToken = randomBytes(32).toString("hex");
  try {
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { phone },
      select: { id: true },
    });
    await prisma.customerSession.create({
      data: {
        id: createHash("sha256").update(sessionToken).digest("hex"),
        customerId: customer.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  await page.context().addCookies([
    {
      name: "ms_customer_session",
      value: sessionToken,
      url: "http://127.0.0.1:4175",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
