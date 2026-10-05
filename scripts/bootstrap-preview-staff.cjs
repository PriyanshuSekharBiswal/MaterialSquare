require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("node:crypto");

async function main() {
  if (process.env.PREVIEW_STAFF_BOOTSTRAP_ENABLED !== "true") {
    console.log("Preview staff bootstrap is disabled.");
    return;
  }

  const phone = process.env.PREVIEW_STAFF_PHONE?.trim();
  const action = process.env.PREVIEW_STAFF_ACTION || "upsert";
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new Error("PREVIEW_STAFF_PHONE must be a valid 10-digit mobile number.");
  }
  if (!["upsert", "remove"].includes(action)) {
    throw new Error("PREVIEW_STAFF_ACTION must be upsert or remove.");
  }

  const db = new PrismaClient();
  try {
    if (action === "remove") {
      const result = await db.staffUser.deleteMany({ where: { phone } });
      console.log(`Removed ${result.count} preview staff account(s).`);
      return;
    }

    const password = process.env.PREVIEW_STAFF_PASSWORD;
    const name = process.env.PREVIEW_STAFF_NAME?.trim();
    if (!password || password.length < 8 || !name) {
      throw new Error(
        "Set PREVIEW_STAFF_NAME and PREVIEW_STAFF_PASSWORD (at least 8 characters).",
      );
    }

    const salt = randomBytes(16).toString("hex");
    const passwordHash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
    await db.staffUser.upsert({
      where: { phone },
      create: { phone, name, passwordHash, role: "SUPER_ADMIN", isActive: true },
      update: {
        name,
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
        authVersion: { increment: 1 },
      },
    });
    console.log("Preview staff account is ready.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
