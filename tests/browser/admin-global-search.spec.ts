import { expect, test } from "@playwright/test";

test("admin search opens quick access on focus and carries product text into catalogue search", async ({
  page,
}) => {
  const product = {
    id: "cement-search-preview",
    slug: "cement-search-preview",
    code: "QA-CEM-01",
    name: "QA cement pack preview",
    brand: "Material Square QA",
    category: "cement",
    categoryLabel: "Cement & Aggregates",
    unit: "bag",
    packaging: "50 kg bag",
    image: "",
    grade: "PPC",
    description: "Search fixture.",
    minOrderQty: "1 bag",
    dispatchTime: "Confirm",
    price: 425,
    compareAtPrice: null,
    priceNote: "Reference price.",
    offerLabel: null,
    offerStartsAt: null,
    offerEndsAt: null,
    isInStock: false,
    availabilityStatus: "CHECK_AVAILABILITY",
    isPublished: true,
    features: [],
    applications: [],
    specifications: {},
    variants: [],
    sortOrder: 0,
  };
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
    route.fulfill({ json: [product] }),
  );
  await page.route("**/api/workspace/customers?**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "customer-search-one",
            name: "Test Cement Customer",
            phone: "919999000000",
            companyName: "Demo Build Co",
            city: "Noida",
            pincode: "201301",
          },
        ],
        total: 1,
        page: 1,
      },
    }),
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
  await expect(globalSearch).toBeVisible();
  await globalSearch.focus();
  await expect(page.getByText("QUICK ACCESS")).toBeVisible();
  await globalSearch.fill("cement");
  const productSuggestion = page.getByRole("option", {
    name: /QA cement pack preview/,
  });
  await expect(productSuggestion).toBeVisible();
  await productSuggestion.click();
  await expect(page.getByLabel("Search catalogue")).toHaveValue(
    "QA cement pack preview",
  );
  await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
  await expect(globalSearch).toBeVisible();

  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(globalSearch).toBeVisible();

  await globalSearch.fill("919999000000");
  const customerSuggestion = page.getByRole("option", {
    name: /Test Cement Customer/,
  });
  await expect(customerSuggestion).toBeVisible();
  await customerSuggestion.click();
  await expect(page.getByLabel("Search by name or mobile")).toHaveValue(
    "919999000000",
  );
});
