import { test, expect } from "@playwright/test";
import { SITE_CONTENT_DEFAULTS } from "../../packages/types/src/site-content";
const quote = { id: "quote-one", quoteNumber: "MS-QT-TEST", status: "QUOTE_SENT", subtotal: 1000, discountAmount: 0, taxAmount: 180, freightAmount: 0, totalAmount: 1180, validUntil: "2099-01-01T00:00:00Z", createdAt: "2026-10-06T00:00:00Z", items: [
  { id: "line", productName: "Cement", brandName: "Brand A", categoryName: "Cement", quantityMt: 10, unitPrice: 100, lineTotal: 1000, unit: "bag", specification: "50 kg", options: [{ id: "option", productName: "Cement", brandName: "Brand B", categoryName: "Cement", quantityMt: 10, unitPrice: 90, lineTotal: 900, unit: "bag", specification: "50 kg" }] },
] };
for (const action of ["ACCEPT", "REJECT", "REQUEST_CHANGES"] as const) {
  test(`customer submits ${action} with selected brands and revision details`, async ({ page }) => {
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: {} }));
    await page.route("**/api/site-content", route => route.fulfill({ json: SITE_CONTENT_DEFAULTS }));
    await page.route("**/api/customer/me", route => route.fulfill({ json: { id: "customer", name: "Test Customer", phone: "9876543210", city: "Noida", pincode: "201301" } }));
    await page.route("**/api/customer/activity", route => route.fulfill({ json: { requests: [], quotations: [quote], orders: [], loyalty: null } }));
    let response: any;
    await page.route("**/api/customer/quotations/quote-one/response", route => {
      response = route.request().postDataJSON();
      return route.fulfill({ json: { decision: action, orderNumber: "MS-ORD-TEST" } });
    });
    await page.goto("/account/quotations/quote-one");
    await page.getByLabel("Choose brand for Cement").selectOption("option");
    await page.getByLabel("Notes or requested changes").fill("Please deliver next week");
    await page.getByRole("button", { name: action === "ACCEPT" ? "Accept quotation" : action === "REJECT" ? "Decline quotation" : "Request changes", exact: true }).click();
    if (action === "ACCEPT") {
      expect(response).toBeUndefined();
      await page.getByRole("button", { name: "Confirm acceptance", exact: true }).click();
    }
    await expect(page.getByRole("status").filter({ hasText: action === "ACCEPT" ? "MS-ORD-TEST" : action === "REJECT" ? "declined" : "changes were sent" })).toBeVisible();
    expect(response).toEqual({ decision: action, notes: "Please deliver next week", selections: [{ itemId: "line", optionId: "option" }] });
  });
}
