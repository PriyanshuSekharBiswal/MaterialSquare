import { expect, test } from "@playwright/test";

test("catalogue preview uses the same displayed pack label as the storefront", async ({
  page,
}) => {
  const product = {
    id: "cement-pack-preview",
    slug: "cement-pack-preview",
    code: "QA-CEM-01",
    name: "QA cement pack preview",
    brand: "Material Square QA",
    brandTagline: "QA fixture",
    category: "cement",
    categoryLabel: "Cement & Aggregates",
    unit: "bag",
    packaging: "50 kg bag",
    image: "",
    grade: "PPC",
    description: "Preview-only test fixture.",
    minOrderQty: "1 bag",
    dispatchTime: "Confirm",
    price: 425,
    compareAtPrice: null,
    priceNote: "Online reference price; confirm locally.",
    offerLabel: null,
    offerStartsAt: null,
    offerEndsAt: null,
    isInStock: false,
    availabilityStatus: "CHECK_AVAILABILITY",
    isPublished: true,
    features: [],
    applications: [],
    specifications: { "Pack size": "50 kg" },
    variants: [],
    sortOrder: 0,
  };
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "preview-parity-token" } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({ json: { name: "Owner", role: "SUPER_ADMIN", isDemo: true } }),
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
    route.fulfill({ json: { items: [], total: 0 } }),
  );
  await page.route("**/api/products/catalogue/partner-brands", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/products/catalogue", (route) =>
    route.fulfill({ json: [product] }),
  );

  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.test");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page.getByRole("button", { name: "Products, prices & offers" }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.getByRole("button", { name: "Preview storefront" }).first().click();

  const preview = page.getByRole("dialog");
  const currentCard = preview.locator(".store-preview-current-product");
  await expect(currentCard.locator(".store-preview-product-specs strong")).toHaveText(
    "bag",
  );
  await expect(currentCard.locator(".store-preview-product-specs strong")).not.toHaveText(
    "50 kg bag",
  );
  await expect(preview.getByRole("button", { name: "Product page" })).toBeVisible();
});
