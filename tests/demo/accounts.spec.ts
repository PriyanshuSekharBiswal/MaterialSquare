import { test, expect } from "@playwright/test";

test("demo mode does not expose generated customer OTPs", async ({ page }) => {
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Sign in with your mobile" }),
  ).toBeVisible();
  await expect(page.getByText("Demo accounts", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Demo OTP", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use demo code" })).toHaveCount(
    0,
  );
});
