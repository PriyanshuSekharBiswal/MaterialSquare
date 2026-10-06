import { test, expect } from "@playwright/test";
import { SITE_CONTENT_DEFAULTS } from "../../packages/types/src/site-content";
const managedPage = { id: "page-one", path: "/our-services", title: "Our services", description: "Delivery for your project", published: true,
  sections: [
    { id: "one", kind: "text", title: "Site delivery", body: "Client-managed description", imageUrl: "", imageAlt: "", buttonLabel: "Request a quote", buttonPath: "/get-quote", visible: true },
    { id: "two", kind: "text", title: "Hidden section", body: "Hidden copy", imageUrl: "", imageAlt: "", buttonLabel: "", buttonPath: "", visible: false },
  ] };
test("published custom pages render visible sections and working actions", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/site-content", route => route.fulfill({ json: { ...SITE_CONTENT_DEFAULTS, "website.pages": JSON.stringify([managedPage]) } }));
  await page.goto("/our-services");
  await expect(page.getByRole("heading", { name: "Our services", exact: true })).toBeVisible();
  await expect(page.getByText("Client-managed description")).toBeVisible();
  await expect(page.getByText("Hidden copy")).toHaveCount(0);
  await expect(page).toHaveTitle("Our services");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Delivery for your project");
  await page.getByRole("link", { name: "Request a quote", exact: true }).click();
  await expect(page).toHaveURL(/get-quote/);
});
test("unpublished custom pages do not render their copy", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/site-content", route => route.fulfill({ json: { ...SITE_CONTENT_DEFAULTS, "website.pages": JSON.stringify([{ ...managedPage, published: false }]) } }));
  await page.goto("/our-services");
  await expect(page.getByRole("heading", { name: "Page unavailable" })).toBeVisible();
  await expect(page.getByText("Client-managed description")).toHaveCount(0);
});
