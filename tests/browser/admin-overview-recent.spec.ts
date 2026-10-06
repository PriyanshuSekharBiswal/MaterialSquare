import { expect, test } from "@playwright/test";

test("overview recent changes link to the matching admin workspace", async ({
  page,
}) => {
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "overview-recent-test-token" } }),
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
        totals: { pageViews: 0, productViews: 0, addToList: 0, requestHandoffs: 0 },
        daily: [],
        topPages: [],
        topProducts: [],
        privacy: "Aggregate counts only.",
      },
    }),
  );
  await page.route("**/api/admin/audit/recent", (route) =>
    route.fulfill({
      json: {
        since: "2026-09-29T00:00:00.000Z",
        categories: ["Storefront", "Sales", "Procurement", "Settings & team"],
        total: 5,
        limit: 50,
        items: [
          {
            id: "recent-staff",
            action: "STAFF_ACCESS_UPDATED",
            entityType: "STAFF_USER",
            entityId: "staff-one",
            createdAt: "2026-10-06T08:30:00.000Z",
            title: "Catalogue manager",
            category: "Settings & team",
            entityLabel: "Staff account",
            actionLabel: "Access updated",
            changedFields: ["role"],
            changes: [
              { field: "role", before: "SALES_MANAGER", after: "CATALOG_MANAGER" },
            ],
            staff: { name: "Owner", role: "SUPER_ADMIN" },
          },
          {
            id: "recent-quote",
            action: "QUOTATION_CREATED",
            entityType: "QUOTATION",
            entityId: "quote-one",
            createdAt: "2026-10-06T08:29:00.000Z",
            title: "Quote 001",
            category: "Sales",
            entityLabel: "Quotation",
            actionLabel: "Added",
            changedFields: [],
            changes: [],
            staff: { name: "Owner", role: "SUPER_ADMIN" },
          },
          {
            id: "recent-supplier",
            action: "SUPPLIER_CREATED",
            entityType: "SUPPLIER",
            entityId: "supplier-one",
            createdAt: "2026-10-06T08:28:00.000Z",
            title: "Supplier One",
            category: "Procurement",
            entityLabel: "Supplier",
            actionLabel: "Added",
            changedFields: [],
            changes: [],
            staff: { name: "Owner", role: "SUPER_ADMIN" },
          },
          {
            id: "recent-content",
            action: "WEBSITE_CONTENT_PUBLISHED",
            entityType: "WEBSITE_CONTENT",
            entityId: "site-content",
            createdAt: "2026-10-06T08:27:00.000Z",
            title: "Website content",
            category: "Storefront",
            entityLabel: "Website content",
            actionLabel: "Published",
            changedFields: [],
            changes: [],
            staff: { name: "Owner", role: "SUPER_ADMIN" },
          },
          {
            id: "recent-product",
            action: "CATALOG_PRODUCT_UPDATED",
            entityType: "CATALOG_PRODUCT",
            entityId: "product-one",
            createdAt: "2026-10-06T08:26:00.000Z",
            title: "Product One",
            category: "Storefront",
            entityLabel: "Catalogue product",
            actionLabel: "Edited",
            changedFields: ["price"],
            changes: [],
            staff: { name: "Owner", role: "SUPER_ADMIN" },
          },
        ],
      },
    }),
  );

  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();

  await expect(page.getByRole("button", { name: "Open staff & roles" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open sales workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open business management" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open website content" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open catalogue" })).toBeVisible();
});
