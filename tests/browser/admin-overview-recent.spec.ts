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
        customers: 3,
        newCustomers30Days: 2,
        openFollowups: 1,
        closedFollowups: 4,
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
  await page.route("**/api/workspace/customers?**", (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1 } }),
  );
  await page.route("**/api/workspace/followups?**", (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1 } }),
  );

  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();

  await expect(page.getByRole("button", { name: "Open staff & roles" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open sales workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open business management" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open website content" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open catalogue" })).toBeVisible();

  await page.getByRole("button", { name: /Customer records/ }).click();
  await expect(page.getByText("0 customer records")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search the admin workspace" })).toHaveCount(0);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: /Open follow-ups/ }).click();
  await expect(page.getByRole("heading", { name: "Enquiry follow-ups" })).toBeVisible();
  await expect(page.getByLabel("Filter status")).toHaveValue("OPEN");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: /Closed follow-ups/ }).click();
  await expect(page.getByLabel("Filter status")).toHaveValue("CLOSED");

  await page.getByRole("button", { name: "Recent changes" }).click();
  await expect(page.getByRole("heading", { name: "Recent changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open staff & roles" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open sales workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open business management" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open website content" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open catalogue" })).toBeVisible();
});
