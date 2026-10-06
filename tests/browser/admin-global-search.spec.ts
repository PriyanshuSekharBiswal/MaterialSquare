import { expect, test } from "@playwright/test";

test("admin search suggests a destination and carries product text into catalogue search", async ({
  page,
}) => {
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "global-search-test-token" } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Owner", role: "SUPER_ADMIN", isDemo: true },
    }),
  );
  await page.route("**/api/workspace/overview", (route) =>
    route.fulfill({
      json: {
        customers: 0,
        newCustomers30Days: 0,
        openFollowups: 0,
        closedFollowups: 0,
        demo: true,
      },
    }),
  );
  await page.route("**/api/analytics/overview**", (route) =>
    route.fulfill({
      json: {
        days: 30,
        totals: {
          pageViews: 0,
          productViews: 0,
          addToList: 0,
          requestHandoffs: 0,
        },
        daily: [],
        topPages: [],
        topProducts: [],
        privacy: "Aggregate counts only.",
      },
    }),
  );
  await page.route("**/api/admin/audit/recent", (route) =>
    route.fulfill({ json: { items: [], total: 0 } }),
  );
  await page.route("**/api/products/catalogue", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/products/catalogue/partner-brands", (route) =>
    route.fulfill({ json: [] }),
  );

  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.test");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();

  const globalSearch = page.getByRole("combobox", {
    name: "Search the admin workspace",
  });
  await page.keyboard.press("Control+k");
  await expect(page.getByText("QUICK ACCESS")).toBeVisible();
  await globalSearch.fill("cement");
  const productSuggestion = page.getByRole("option", {
    name: /Search products for “cement”/,
  });
  await expect(productSuggestion).toBeVisible();
  await globalSearch.press("ArrowDown");
  await globalSearch.press("Enter");

  await expect(
    page.getByRole("heading", { name: "No catalogue products yet" }),
  ).toBeVisible();
  await expect(page.getByLabel("Search catalogue")).toHaveValue("cement");

  await globalSearch.fill("UltraTech");
  await globalSearch.press("ArrowDown");
  await globalSearch.press("Enter");
  await expect(page.getByLabel("Search catalogue")).toHaveValue("UltraTech");
});
