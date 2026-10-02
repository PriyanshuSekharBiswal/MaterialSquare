import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});
const phones = ["8888000001", "8888000002"];
test.beforeAll(async () => {
  await db.customer.deleteMany({ where: { phone: { in: phones } } });
  await db.otpSession.deleteMany({ where: { phone: { in: phones } } });
  await db.staffEnquiry.deleteMany({ where: { phone: { in: phones } } });
});
test.afterAll(async () => {
  await db.customer.deleteMany({ where: { phone: { in: phones } } });
  await db.otpSession.deleteMany({ where: { phone: { in: phones } } });
  await db.staffEnquiry.deleteMany({ where: { phone: { in: phones } } });
  await db.staffUser.deleteMany({
    where: { phone: "8888000000", isDemo: true },
  });
  await db.$disconnect();
});
async function login(page: Page, phone: string) {
  await page.goto("/account");
  await page.getByRole("button", { name: phone, exact: true }).click();
  await page.getByRole("button", { name: "Send OTP", exact: true }).click();
  await expect(page.getByLabel("Demo OTP", { exact: true })).toHaveText(
    /^\d{6}$/,
  );
  await page.getByRole("button", { name: "Use demo code" }).click();
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page.getByLabel("Full name")).toBeVisible();
}
test("real API demo: same account on two devices, separate account, staff follow-up and refresh", async ({
  browser,
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window.crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    }),
  );
  await login(page, phones[0]);
  await page.getByLabel("Full name").fill("Browser Customer A");
  await page.getByLabel("City", { exact: true }).fill("Noida");
  await page.getByLabel("PIN code").fill("201301");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
  await page.goto("/get-quote");
  await page
    .getByPlaceholder("Material name", { exact: true })
    .fill("Demo pipe");
  await page.getByRole("button", { name: "Add custom material" }).click();
  await page.getByLabel("Quantity for Demo pipe").fill("12");
  await page
    .getByPlaceholder("Enter the required size or ask staff to confirm")
    .fill("3/4 inch");
  await expect(
    page.getByText("Saving your material list…", { exact: true }),
  ).not.toBeVisible();
  await expect
    .poll(
      async () =>
        (
          (await db.customer.findUniqueOrThrow({ where: { phone: phones[0] } }))
            .materialList as any[]
        )[0]?.quantity,
    )
    .toBe(12);
  // The demo deliberately retains a five-second per-phone request cooldown.
  await db.otpSession.updateMany({
    where: { phone: phones[0] },
    data: { createdAt: new Date(Date.now() - 60000) },
  });
  const second = await browser.newContext({
    baseURL: "http://127.0.0.1:4175",
    viewport: { width: 390, height: 844 },
  });
  const phone = await second.newPage();
  await login(phone, phones[0]);
  await expect(phone.getByLabel("Full name")).toHaveValue("Browser Customer A");
  await phone.goto("/get-quote");
  await expect(phone.getByLabel("Quantity for Demo pipe")).toHaveValue("12");
  await phone.getByLabel("Quantity for Demo pipe").fill("18");
  await expect
    .poll(
      async () =>
        (
          (await db.customer.findUniqueOrThrow({ where: { phone: phones[0] } }))
            .materialList as any[]
        )[0]?.quantity,
    )
    .toBe(18);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByLabel("Quantity for Demo pipe")).toHaveValue("18");
  await phone.goto("/account");
  await phone.getByRole("button", { name: "Log out", exact: true }).click();
  await login(phone, phones[1]);
  await expect(phone.getByLabel("Full name")).toHaveValue("");
  await phone.goto("/get-quote");
  await expect(phone.locator(".material-editor")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Quantity for Demo pipe")).toHaveValue("18");
  const staff = await browser.newPage();
  await staff.goto("http://127.0.0.1:4176");
  await staff.getByLabel("Mobile number", { exact: true }).fill("8888000000");
  await staff.getByLabel("Password", { exact: true }).fill("BrowserDemo@2026");
  await staff.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    staff.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(
    staff.getByText("Customer accounts", { exact: true }),
  ).toBeVisible();
  await staff.screenshot({
    path: "/private/tmp/material-square-staff-overview.png",
    fullPage: true,
  });
  await staff.getByRole("button", { name: "Customers", exact: true }).click();
  const record = staff
    .locator(".workspace-record")
    .filter({ hasText: "Browser Customer A" });
  await record.getByRole("button", { name: "View account" }).click();
  await expect(staff.getByText("Demo pipe", { exact: true })).toBeVisible();
  await staff
    .getByRole("button", { name: "Record follow-up", exact: true })
    .click();
  await staff
    .getByLabel("Staff notes")
    .fill("Customer requested rates through WhatsApp.");
  await staff.getByRole("button", { name: "Save follow-up" }).click();
  await expect(
    staff.getByText("Follow-up saved.", { exact: true }),
  ).toBeVisible();
  await staff.reload();
  await expect(staff.locator(".workspace")).toBeVisible();
  await staff.getByRole("button", { name: "Follow-ups", exact: true }).click();
  await staff.getByRole("button", { name: "Open follow-up" }).click();
  await expect(staff.getByLabel("Staff notes")).toHaveValue(
    "Customer requested rates through WhatsApp.",
  );
  await staff
    .getByLabel("Follow-up status", { exact: true })
    .selectOption("CONTACTED");
  await staff.getByRole("button", { name: "Save follow-up" }).click();
  await expect(
    staff.locator(".status-label").filter({ hasText: "Contacted" }),
  ).toBeVisible();
  await staff.setViewportSize({ width: 390, height: 844 });
  expect(
    await staff.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await staff.screenshot({
    path: "/private/tmp/material-square-staff-mobile.png",
    fullPage: true,
  });
  await second.close();
  await staff.close();
});
