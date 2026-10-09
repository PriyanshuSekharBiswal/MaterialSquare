import { test, expect } from "@playwright/test";
import { SITE_CONTENT_DEFAULTS } from "@material-square/types";

test("the service map loads published coverage after a temporary API failure", async ({ page }) => {
  let siteContentRequests = 0;
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 503, json: { message: "Temporary API outage" } }),
  );
  await page.route("**/api/site-content", (route) => {
    siteContentRequests += 1;
    if (siteContentRequests === 1) {
      return route.fulfill({ status: 503, json: { message: "API is starting" } });
    }
    return route.fulfill({
      json: {
        ...SITE_CONTENT_DEFAULTS,
        "contact.location": "Delhi NCR",
      },
    });
  });

  await page.goto("/");
  await page.locator(".deferred-direction-map").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "All 6 Regions" })).toBeVisible();
  await expect(page.locator("#transportation-map .route-group")).toHaveCount(6);
  await expect(page.locator("#transportation-map .origin-city-markers [role='button']")).toHaveCount(6);
  expect(siteContentRequests).toBeGreaterThanOrEqual(2);
});
