import { test, expect } from "@playwright/test";
test("staff login normalizes +91 and displays backend field errors", async ({ page }) => {
  let payload: unknown;
  await page.route("**/api/auth/staff/login", route => {
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 400, json: { message: "Invalid request", issues: { fieldErrors: { phone: ["Invalid"] } } } });
  });
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("+91 98765 43210");
  await page.getByLabel("Password", { exact: true }).fill("Diagnostic-only-password-123");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await expect(page.getByRole("alert")).toHaveText("Enter a valid 10-digit Indian mobile number (with optional +91).");
  expect(payload).toEqual({ phone: "9876543210", password: "Diagnostic-only-password-123" });
});
test("malformed staff identifier is explained before sending credentials", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/auth/staff/login", route => { requests++; return route.fulfill({ status: 401, json: {} }); });
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("invalid-id");
  await page.getByLabel("Password", { exact: true }).fill("Diagnostic-only-password-123");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await expect(page.getByRole("alert")).toContainText("valid 10-digit Indian mobile number");
  expect(requests).toBe(0);
});
