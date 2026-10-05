import { test, expect } from "@playwright/test";
import { signInDemoStaff } from "./staff-session";

test("staff publish a product that guests can find on the customer storefront", async ({
  page,
}) => {
  const productName = `Browser verified cement ${Date.now()}`;
  await signInDemoStaff(page);

  await page.getByRole("button", { name: "Products, prices & offers" }).click();
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel("Product name").fill(productName);
  await page
    .getByRole("textbox", { name: "Brand", exact: true })
    .fill("Browser Verification Brand");
  await page.getByLabel("Product code").fill(`E2E-${Date.now()}`);
  await page.getByLabel("Category key").fill("cement");
  await page.getByLabel("Category name").fill("Cement & Aggregates");
  await page.getByLabel("Unit shown to customer").fill("50 kg bag");
  await page.getByLabel("Price (₹ per unit)").fill("299");
  await page
    .getByLabel("Primary product image (required)")
    .fill("/images/products/cpvc-pipe-illustration.png");
  await page.getByLabel("Publish on website").check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Product saved and published to the website",
  );

  await page.goto("http://127.0.0.1:4175/marketplace");
  await page
    .getByPlaceholder(
      "Search product, brand, size or pack (e.g. cement, Astral, 25 mm, 20 L)...",
    )
    .fill(productName);
  await expect(
    page.getByRole("heading", { name: productName, exact: true }),
  ).toBeVisible();
  const publishedProduct = page.locator(".catalog-product-card").filter({
    has: page.getByRole("heading", { name: productName, exact: true }),
  });
  await expect(publishedProduct.locator(".rate-caption")).toHaveText(
    "Price per unit",
  );
  await expect(publishedProduct.locator(".rate-amount")).toHaveText("₹299");
});
