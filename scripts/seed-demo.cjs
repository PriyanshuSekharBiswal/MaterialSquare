const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("node:crypto");
async function main() {
  if (
    process.env.APP_ENV !== "demo" ||
    process.env.DEMO_AUTH_ENABLED !== "true"
  )
    throw Error(
      "Demo seeding requires APP_ENV=demo and DEMO_AUTH_ENABLED=true",
    );
  const phone = process.env.DEMO_STAFF_PHONE || "9000000000";
  const password = process.env.DEMO_STAFF_PASSWORD;
  if (!/^[6-9]\d{9}$/.test(phone) || !password || password.length < 12)
    throw Error(
      "Set DEMO_STAFF_PHONE and a DEMO_STAFF_PASSWORD of at least 12 characters",
    );
  const db = new PrismaClient();
  try {
    const email = `demo-${phone}@material-square.invalid`;
    const existing = await db.staffUser.findFirst({
      where: { OR: [{ phone }, { email }] },
    });
    if (existing && !existing.isDemo)
      throw Error("Refusing to change a non-demo staff account");
    const salt = randomBytes(16).toString("hex");
    const passwordHash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
    const data = {
      name: "Demo Administrator",
      phone,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      isDemo: true,
    };
    if (existing)
      await db.staffUser.update({ where: { id: existing.id }, data });
    else await db.staffUser.create({ data });
    console.log(
      "Demo staff account is ready. Existing customer data was preserved.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
