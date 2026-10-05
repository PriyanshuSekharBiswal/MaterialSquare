import { expect, type Page } from "@playwright/test";

export async function signInDemoStaff(page: Page) {
  await page.goto("http://127.0.0.1:4176");
  await page.getByLabel("Mobile number or email").fill("8888000000");
  await page.getByLabel("Password").fill("BrowserDemo@2026");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Executive Overview" }),
  ).toBeVisible();
}
