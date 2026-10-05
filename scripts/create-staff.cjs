require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("node:crypto");
async function main() {
  const { STAFF_EMAIL, STAFF_PASSWORD, STAFF_NAME, STAFF_PHONE } = process.env;
  if (
    !STAFF_PASSWORD ||
    STAFF_PASSWORD.length < 8 ||
    !STAFF_NAME ||
    !STAFF_PHONE ||
    !/^[6-9]\d{9}$/.test(STAFF_PHONE)
  )
    throw new Error(
      "Set STAFF_PHONE, STAFF_NAME, STAFF_PASSWORD (at least 8 characters), and STAFF_EMAIL if available.",
    );
  const db = new PrismaClient();
  const salt = randomBytes(16).toString("hex");
  const passwordHash = `scrypt:${salt}:${scryptSync(STAFF_PASSWORD, salt, 64).toString("hex")}`;
  try {
    await db.staffUser.create({
      data: {
        email: STAFF_EMAIL?.trim().toLowerCase() || null,
        name: STAFF_NAME,
        phone: STAFF_PHONE,
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });
    console.log("Staff account created.");
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
