import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { SITE_CONTENT_DEFAULTS } from "@material-square/types";

const customer = {
  id: "customer-1",
  name: "Test Customer",
  phone: "9876543210",
  email: "test@example.com",
  companyName: "Test Builders",
  shippingAddress: "Plot 42, Sector 10",
  city: "Noida",
  pincode: "201301",
};
const publishedPipe = {
  id: "published-pipe-test",
  code: "TEST-PIPE-01",
  name: "Astral CPVC PRO Test Listing",
  brand: "Astral Pipes",
  brandTagline: "CPVC Pro",
  category: "pipes",
  categoryLabel: "Pipes & Fittings",
  unit: "3 m length",
  image: "/images/products/cpvc-pipe-illustration.png",
  features: [],
  applications: [],
  minOrderQty: "1 length",
  inStock: false,
  specs: { sizes: "1/2 inch, 3/4 inch, 1 inch" },
};
test.beforeEach(async ({ page }) => {
  // Avoid coupling offline browser tests to whichever local API happens to be running.
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 503, json: { message: "Offline test fixture" } }),
  );
  await page.route("**/api/site-content", (route) =>
    route.fulfill({
      json: {
        ...SITE_CONTENT_DEFAULTS,
        "contact.phone": "9876543210",
        "contact.phoneDisplay": "+91 98765 43210",
        "contact.email": "quotes@example.test",
      },
    }),
  );
  await page.route("**/api/products", (route) =>
    route.fulfill({ status: 503, json: { message: "Offline test fixture" } }),
  );
});
test("general enquiries prepare WhatsApp and email messages without claiming delivery", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Mobile number").fill("9876543210");
  await page
    .getByLabel("Site / delivery address — building, street and locality")
    .fill("Plot 42, Sector 10");
  await page.getByLabel("City").fill("Noida");
  await page.getByLabel("PIN code").fill("201301");
  await page
    .getByLabel("Your question *")
    .fill("Please call me about materials for my project.");
  await page.getByRole("button", { name: "Preview enquiry" }).click();
  const wa = page.getByRole("link", { name: "Continue in WhatsApp" });
  await expect(wa).toBeVisible();
  const url = new URL((await wa.getAttribute("href"))!);
  const message = url.searchParams.get("text")!;
  for (const value of [
    "Test Customer",
    "9876543210",
    "Plot 42, Sector 10",
    "Noida",
    "201301",
    "Please call me about materials for my project.",
  ])
    expect(message).toContain(value);
  await expect(page.getByRole("option", { name: "Email" })).toBeEnabled();
  await page.getByLabel("Preferred contact channel").selectOption("email");
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByRole("button", { name: "Preview enquiry" }).click();
  const email = page.getByRole("link", { name: "Continue in email" });
  expect(decodeURIComponent((await email.getAttribute("href"))!)).toContain(
    "body=Material Square",
  );
  await page.getByLabel("PIN code").fill("123");
  await page.getByRole("button", { name: "Preview enquiry" }).click();
  await expect(email).not.toBeVisible();
});
test("customers can browse and build a guest quote list before phone verification", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Your projects, in one place" }),
  ).toBeVisible();
  await page.goto("/get-quote");
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Mobile number")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Verify phone & request quotation" }),
  ).not.toBeVisible();
  await expect(page.getByLabel("Six-digit OTP")).not.toBeVisible();
});

test(
  "customer account explains when its API deployment is missing the account route",
  async ({ page }) => {
    await page.route("**/api/customer/me", (route) =>
      route.fulfill({
        status: 404,
        contentType: "text/plain",
        body: "Cannot GET /api/customer/me",
      }),
    );
    await page.goto("/account");
    await expect(page.getByRole("alert")).toContainText(
      "The account service is out of date. Restart or redeploy the Material Square API",
    );
    await expect(page.getByRole("alert")).not.toContainText("Cannot GET");
  },
);

test("empty client catalogue invites material requests without suggesting sample products", async ({ page }) => {
  await page.route("**/api/products", (route) => route.fulfill({ json: [] }));
  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: "Material listings are being prepared" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a material" })).toHaveAttribute("href", "/contact");
  await expect(page.getByText(/no sample products/i)).toHaveCount(0);
  await page.getByRole("link", { name: "Request a material" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await page.goto("/marketplace?category=paints");
  await expect(page.locator(".results-count-text")).toContainText("in Paints");
  await expect(page.locator(".results-count-text")).not.toContainText("undefined");
});

test("search phrase preselects the matching sellable variant and its image", async ({ page }) => {
  const product = {
    id: "paint-variant-test", code: "AP-SC-DP", name: "SmartCare Damp Proof Waterproofing Paint",
    brand: "Asian Paints", category: "paints", categoryLabel: "Paints & Waterproofing", unit: "tin",
    image: "/images/products/neutral-placeholder.svg", galleryImages: [], features: [], applications: [],
    inStock: false, availabilityStatus: "CHECK_AVAILABILITY", specs: {},
    variants: [
      { id: "paint-white-10l", label: "10 L", unit: "tin", attributes: { Colour: "White", Pack: "10 L" }, image: "/client/white-10l.jpg", galleryImages: [], inStock: true, availabilityStatus: "IN_STOCK", sortOrder: 0, price: 900 },
      { id: "paint-black-20l", label: "20 L", unit: "tin", attributes: { Colour: "Black", Pack: "20 L" }, image: "/client/black-20l.jpg", galleryImages: [], inStock: true, availabilityStatus: "IN_STOCK", sortOrder: 1, price: 1600 },
    ],
  };
  await page.route("**/api/products", (route) => route.fulfill({ json: [product] }));
  await page.goto("/product/paint-variant-test?q=Asian%20Paints%20SmartCare%20Black%2020L");
  await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
  await expect(page.getByRole("button", { name: /Black.*₹1,600/ })).toBeVisible();
  await expect(page.getByText("Authorised partner brand")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Black" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "20 L" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".product-detail-image > img")).toHaveAttribute("src", "/client/black-20l.jpg");
  await expect(page.getByText("₹1,600", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Add to Material List/ }).click();
  await page.goto("/material-list");
  await expect(page.getByLabel("Selected product option")).toHaveValue(/Colour: Black/);
  await expect(page.locator(".material-thumb")).toHaveAttribute("src", "/client/black-20l.jpg");
});

test("selecting an autocomplete product opens its matching product option", async ({ page }) => {
  const product = {
    id: "autocomplete-paint-test", code: "AP-SC-DP", name: "SmartCare Damp Proof Waterproofing Paint",
    brand: "Asian Paints", category: "paints", categoryLabel: "Paints & Waterproofing", unit: "tin",
    image: "/images/products/neutral-placeholder.svg", galleryImages: [], features: [], applications: [],
    inStock: false, availabilityStatus: "CHECK_AVAILABILITY", specs: {},
    variants: [
      { id: "paint-white-10l", label: "10 L", unit: "tin", attributes: { Colour: "White", Pack: "10 L" }, image: "/client/white-10l.jpg", galleryImages: [], inStock: true, availabilityStatus: "IN_STOCK", sortOrder: 0, price: 900 },
      { id: "paint-black-20l", label: "20 L", unit: "tin", attributes: { Colour: "Black", Pack: "20 L" }, image: "/client/black-20l.jpg", galleryImages: [], inStock: true, availabilityStatus: "IN_STOCK", sortOrder: 1, price: 1600 },
    ],
  };
  await page.route("**/api/products", (route) => route.fulfill({ json: [product] }));
  await page.goto("/marketplace");
  await page.getByLabel("Search materials catalogue").fill("Asian Paints SmartCare Black 20L");
  await page.locator(".product-suggestion-item").getByText(product.name).click();

  await expect(page).toHaveURL(/\/product\/autocomplete-paint-test\?q=/);
  await expect(page.getByRole("button", { name: "Black" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "20 L" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".product-detail-image > img")).toHaveAttribute("src", "/client/black-20l.jpg");
});

test("quotation submission verifies the customer and saves a request to the account and staff queue", async ({
  page,
}) => {
  let authenticated = false;
  let requestBody: Record<string, unknown> | undefined;
  let requestRows: Record<string, unknown>[] = [];
  await page.route("https://verify.msg91.com/otp-provider.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.initSendOTP = () => { window.sendOtp = (phone, success) => success({reqId:"req-rfq"}); window.retryOtp = (channel, success, failure, id) => success({reqId:id||"req-rfq"}); window.verifyOtp = (otp, success) => success({"access-token":"browser-test.access-token"}); };`,
    }),
  );
  await page.route("**/api/auth/customer/otp/verify-msg91", (route) => {
    authenticated = true;
    return route.fulfill({ json: customer });
  });
  await page.route("**/api/customer/me", (route) =>
    authenticated
      ? route.fulfill({ json: customer })
      : route.fulfill({ status: 401, json: { message: "Please sign in" } }),
  );
  await page.route("**/api/customer/activity", (route) =>
    route.fulfill({
      json: {
        requests: requestRows,
        quotations: [],
        orders: [],
        loyalty: null,
      },
    }),
  );
  await page.route("**/api/customer/rfqs", async (route) => {
    requestBody = route.request().postDataJSON();
    const saved = {
      id: "a1b2c3d4-request",
      status: "NEW",
      siteLocation: `${requestBody?.siteLocation}, ${requestBody?.city} ${requestBody?.pincode}`,
      projectStage: requestBody?.projectStage || null,
      deliveryTiming: requestBody?.deliveryTiming || null,
      notes: requestBody?.notes || null,
      items: (requestBody?.items as Array<Record<string, unknown>>).map(
        (item) => ({
          material: item.name,
          brand: item.brand || "To be confirmed",
          category: item.category || "",
          quantity: item.quantity,
          unit: item.unit,
          specification: item.specification,
        }),
      ),
      createdAt: "2026-10-05T00:00:00.000Z",
    };
    requestRows = [saved];
    return route.fulfill({ status: 201, json: { id: saved.id } });
  });
  await page.goto("/get-quote");
  await page
    .getByPlaceholder("Material name", { exact: true })
    .fill("CPVC pipe");
  await page.getByRole("button", { name: "Add custom material" }).click();
  await page.getByLabel("Quantity for CPVC pipe").fill("20");
  await page
    .getByPlaceholder("Enter the required size or ask staff to confirm")
    .fill("3/4 inch");
  await page.getByLabel("Full name").fill("Test Customer");
  await page
    .getByLabel("Site / delivery address — building, street and locality")
    .fill("Plot 42, Sector 10");
  await page.getByLabel("City").fill("Noida");
  await page.getByLabel("PIN code").fill("201301");
  await page.getByRole("button", { name: "Preview request" }).click();
  await expect(
    page.getByRole("heading", { name: "Review your quotation request" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue in WhatsApp" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Verify phone & request quotation" })
    .click();
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByRole("button", { name: "Continue with OTP" }).click();
  await page.getByLabel("Six-digit verification code").fill("123456");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Requests awaiting a quotation" }),
  ).toBeVisible();
  await expect(
    page.getByText("CPVC pipe · To be confirmed — 20 Pieces · 3/4 inch"),
  ).toBeVisible();
  expect(requestBody).toMatchObject({
    customerName: "Test Customer",
    siteLocation: "Plot 42, Sector 10",
    city: "Noida",
    pincode: "201301",
    items: [
      {
        name: "CPVC pipe",
        quantity: 20,
        unit: "Pieces",
        specification: "3/4 inch",
      },
    ],
  });
});

test("customer OTP waits for widget settings and requires CAPTCHA before sending", async ({
  page,
}) => {
  await page.route("**/api/customer/me", (route) =>
    route.fulfill({ status: 401, json: { message: "Please sign in" } }),
  );
  await page.route("https://verify.msg91.com/otp-provider.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.initSendOTP = () => {
        let ready = false, verified = false, sends = 0;
        const count = document.createElement('output');
        count.setAttribute('aria-label', 'Mock send count');
        count.textContent = '0';
        window.getWidgetData = () => ready ? {captchaValidations: true} : null;
        window.isCaptchaVerified = () => verified;
        window.sendOtp = (phone, success) => { count.textContent = String(++sends); success({reqId:'req-captcha'}); };
        window.retryOtp = () => {};
        window.verifyOtp = () => {};
        setTimeout(() => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Mark test CAPTCHA verified';
          button.addEventListener('click', () => { verified = true; });
          document.getElementById('msg91-captcha').append(button, count);
          ready = true;
        }, 1500);
      };`,
    }),
  );
  await page.goto("/account");
  await expect(
    page.getByRole("button", { name: "Loading SMS security check…" }),
  ).toBeDisabled();
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByRole("button", { name: "Continue with OTP" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Complete the CAPTCHA before requesting your code.",
  );
  await expect(page.getByLabel("Mock send count")).toHaveText("0");
  await page
    .getByRole("button", { name: "Mark test CAPTCHA verified" })
    .click();
  await page.getByRole("button", { name: "Continue with OTP" }).click();
  await expect(page.getByLabel("Six-digit verification code")).toBeVisible();
  await expect(page.getByLabel("Mock send count")).toHaveText("1");
});

test("customer OTP reports a provider rate limit and releases the pending button", async ({ page }) => {
  await page.route("**/api/customer/me", (route) =>
    route.fulfill({ status: 401, json: { message: "Please sign in" } }),
  );
  await page.route("https://verify.msg91.com/otp-provider.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.initSendOTP = () => {
        window.sendOtp = (phone, success, failure) => failure(['IP temporarily blocked']);
        window.retryOtp = () => {};
        window.verifyOtp = () => {};
      };`,
    }),
  );
  await page.goto("/account");
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByRole("button", { name: "Continue with OTP" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "MSG91 has temporarily limited attempts from this network. Please try again later.",
  );
  await expect(page.getByRole("button", { name: "Continue with OTP" })).toBeEnabled();
  await expect(page.getByLabel("Six-digit verification code")).not.toBeVisible();
});

test("customer OTP opens separate quotation and order account pages", async ({
  page,
}) => {
  let authenticated = false;
  let profileRequests = 0;
  const testQuote = {
    id: "quote-1",
    quoteNumber: "MS-QT-2026-0001",
    status: "QUOTE_SENT",
    subtotal: 12500,
    discountAmount: 0,
    taxAmount: 2250,
    freightAmount: 500,
    totalAmount: 15250,
    validUntil: "2026-10-30T00:00:00.000Z",
    createdAt: "2026-10-05T00:00:00.000Z",
    items: [
      {
        id: "line-1",
        productName: "UltraTech PPC Cement",
        brandName: "UltraTech",
        categoryName: "Cement",
        quantityMt: 50,
        unitPrice: 250,
        lineTotal: 12500,
        unit: "bag",
        specification: "50 kg",
        options: [
          {
            id: "option-1",
            productName: "Ambuja PPC Cement",
            brandName: "Ambuja",
            categoryName: "Cement",
            quantityMt: 50,
            unitPrice: 245,
            lineTotal: 12250,
            unit: "bag",
            specification: "50 kg",
          },
        ],
      },
    ],
  };
  const testOrder = {
    id: "order-1",
    orderNumber: "MS-ORD-2026-0001",
    status: "IN_TRANSIT",
    deliverySite: "Sector 18, Noida",
    pincode: "201301",
    subtotal: 12500,
    taxAmount: 2250,
    freightAmount: 500,
    loyaltyDiscountAmount: 0,
    grandTotal: 15250,
    createdAt: "2026-10-04T00:00:00.000Z",
    items: testQuote.items,
    deliveries: [],
    dispatch: {
      currentStep: 3,
      estimatedArrival: "2026-10-08T00:00:00.000Z",
      currentLocation: "Noida depot",
      updatedAt: "2026-10-05T00:00:00.000Z",
    },
  };
  await page.route("https://verify.msg91.com/otp-provider.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.initSendOTP = () => { window.sendOtp = (phone, success) => success({reqId:"req-1"}); window.retryOtp = (channel, success, failure, id) => success({reqId:id||"req-1"}); window.verifyOtp = (otp, success) => success({"access-token":"browser-test.access-token"}); };`,
    }),
  );
  await page.route("**/api/auth/customer/otp/verify-msg91", (route) => {
    authenticated = true;
    return route.fulfill({ json: customer });
  });
  await page.route("**/api/customer/me", (route) => {
    profileRequests += 1;
    return authenticated
      ? route.fulfill({ json: customer })
      : route.fulfill({ status: 401, json: { message: "Please sign in" } });
  });
  await page.route("**/api/customer/activity", (route) =>
    route.fulfill({
      json: {
        requests: [],
        quotations: [testQuote],
        orders: [testOrder],
        loyalty: { pointsBalance: 120, transactions: [] },
      },
    }),
  );
  await page.goto("/account");
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByRole("button", { name: "Continue with OTP" }).click();
  await expect(page.getByLabel("Six-digit verification code")).toBeVisible();
  await page.getByLabel("Six-digit verification code").fill("123456");
  const profileRequestsBeforeVerify = profileRequests;
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Good to see you, Test" }),
  ).toBeVisible();
  expect(profileRequests).toBe(profileRequestsBeforeVerify);
  await page.getByRole("link", { name: "Quotations" }).last().click();
  await expect(
    page.getByRole("heading", { name: "Quotations", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View quote" }).click();
  await expect(
    page.getByRole("heading", { name: "MS-QT-2026-0001" }),
  ).toBeVisible();
  await expect(
    page.locator(".account-alternatives").getByText("Ambuja · Ambuja PPC Cement · ₹245.00 / bag"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Orders & tracking" }).click();
  await expect(
    page.getByRole("heading", { name: "Orders & tracking" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Track order" }).click();
  await expect(
    page.getByRole("heading", { name: "MS-ORD-2026-0001" }),
  ).toBeVisible();
  await expect(page.getByText("Step 3 of 5 · Noida depot")).toBeVisible();
});

test("unconfigured client contact details stay hidden while quotation requests remain account-gated", async ({
  page,
}) => {
  await page.route("**/api/site-content", (route) =>
    route.fulfill({
      json: {
        ...SITE_CONTENT_DEFAULTS,
        "contact.phone": "",
        "contact.phoneDisplay": "",
        "contact.email": "",
        "contact.officeName": "",
        "contact.officeAddress": "",
        "contact.mapUrl": "",
      },
    }),
  );
  await page.goto("/");
  const deferredMap = page.locator(".deferred-direction-map");
  await expect(deferredMap).toBeVisible();
  await expect(page.locator("#transportation-map")).toHaveCount(0);
  await deferredMap.scrollIntoViewIfNeeded();
  await expect(page.locator("#transportation-map")).toBeVisible();
  await expect(
    page.locator("#transportation-map .office-dest-pin-group"),
  ).not.toHaveAttribute("role", "button");
  await expect(page.locator("body")).not.toContainText(
    /97735 05015|orders@materialsquare\.in|Mohan Nagar/i,
  );
  await expect(page.locator(".footer-instagram-link")).toHaveCount(0);
  await page.goto("/contact");
  await expect(page.locator(".contact-channels-section")).toHaveCount(0);

  await page.goto("/get-quote");
  await page.getByPlaceholder("Material name", { exact: true }).fill("Paint");
  await page.getByRole("button", { name: "Add custom material" }).click();
  await page.getByLabel("Full name").fill("Test Customer");
  await page
    .getByLabel("Site / delivery address — building, street and locality")
    .fill("Plot 42, Sector 10");
  await page.getByLabel("City").fill("Noida");
  await page.getByLabel("PIN code").fill("201301");
  await page.getByRole("button", { name: "Preview request" }).click();
  await expect(
    page.getByRole("heading", { name: "Review your quotation request" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Continue in WhatsApp|Continue in email/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Verify phone & request quotation" }),
  ).toBeVisible();
});

test("configured service map uses the client office and contact details", async ({
  page,
}) => {
  await page.route("**/api/site-content", (route) =>
    route.fulfill({
      json: {
        ...SITE_CONTENT_DEFAULTS,
        "contact.location": "Delhi NCR service area",
        "contact.officeName": "Client Central Depot",
        "contact.officeAddress": "Plot 9, Sector 18, Noida, UP 201301",
        "contact.phone": "9876543210",
        "contact.phoneDisplay": "+91 98765 43210",
      },
    }),
  );
  await page.goto("/contact");
  await expect(
    page.locator("#transportation-map .gmaps-search-box"),
  ).toContainText("Client Central Depot");
  await expect(
    page.locator("#transportation-map .gmaps-search-box"),
  ).toContainText("Plot 9, Sector 18, Noida, UP 201301");
  await page
    .getByRole("button", { name: "Office Details", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Client Central Depot");
  await expect(page.getByRole("dialog")).toContainText(
    "Plot 9, Sector 18, Noida, UP 201301",
  );
  await expect(
    page.getByRole("link", { name: "Call: +91 98765 43210" }),
  ).toHaveAttribute("href", "tel:9876543210");
});

test("public pages expose canonical share metadata and account entry stays available", async ({
  page,
}) => {
  await page.goto("/marketplace");
  await expect(page).toHaveTitle(/Construction Materials Catalogue/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:4173/marketplace",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /Construction Materials Catalogue/,
  );

  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Your projects, in one place" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
});

test("homepage search suggestions reflect the live catalogue and staff-set price", async ({
  page,
}) => {
  const liveProduct = {
    id: "live-manager-product",
    code: "MS-LIVE-01",
    name: "Live Manager Pipe",
    brand: "Manager Brand",
    category: "pipes",
    categoryLabel: "Pipes & Fittings",
    unit: "3 m length",
    image: "/images/products/cpvc-pipe-illustration.png",
    inStock: true,
    price: "456.00",
    features: [],
    applications: [],
    specs: {},
  };
  const events: Record<string, unknown>[] = [];
  await page.route("**/api/analytics/events", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ json: { recorded: true } });
  });
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: [liveProduct] }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Browse materials from the current catalogue.",
    }),
  ).toBeVisible();
  await expect(page.locator(".search-animated-hint")).toContainText(
    /Live Manager Pipe|Manager Brand|Pipes & Fittings/,
  );
  const footerCategoryLinks = page
    .locator(".footer-nav-list")
    .first()
    .getByRole("link");
  await expect(footerCategoryLinks).toHaveCount(1);
  await expect(footerCategoryLinks).toHaveText(["Pipes & Fittings"]);
  await expect(
    page.getByText("Elite Buildcon Projects", { exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("Search products and brands").fill("Live Manager Pipe");
  await expect(page.getByText("Matching Products")).toBeVisible();
  await expect(page.getByText("₹456", { exact: true })).toBeVisible();
  await expect(
    page.locator(".product-suggestion-item").getByText("Live Manager Pipe", {
      exact: true,
    }),
  ).toBeVisible();
  await expect.poll(() => events.length).toBeGreaterThan(0);
  expect(events).toContainEqual({ type: "page_view", target: "home" });
  expect(JSON.stringify(events)).not.toContain("Live Manager Pipe");
});

test("product detail lets customers search and select pack variants with their own price and images", async ({
  page,
}) => {
  const paint = {
    id: "paint-family",
    code: "MS-PNT-TEST",
    name: "Interior Emulsion",
    brand: "Example Paints",
    category: "paints",
    categoryLabel: "Paints & Wall Prep",
    unit: "pack",
    image: "/images/products/paint-bucket-illustration.png",
    galleryImages: [
      "/images/products/paint-bucket-illustration.png",
      "/images/categories/paints-category.webp",
    ],
    inStock: false,
    features: [],
    applications: [],
    specs: {},
    variants: [
      {
        id: "paint-1l",
        label: "1 L · Base White",
        attributes: { volume: "1 L", shade: "Base White" },
        unit: "1 L tin",
        price: "187.00",
        compareAtPrice: "258.00",
        priceNote: "Indicative; confirm",
        inStock: false,
        sortOrder: 0,
      },
      {
        id: "paint-4l",
        label: "4 L · Base White",
        attributes: { volume: "4 L", shade: "Base White" },
        unit: "4 L tin",
        price: "724.00",
        compareAtPrice: "953.00",
        priceNote: "Indicative; confirm",
        inStock: false,
        sortOrder: 1,
      },
    ],
  };
  const relatedPaint = {
    ...paint,
    id: "paint-family-related",
    code: "MS-PNT-RELATED",
    name: "Exterior Emulsion",
    variants: [],
  };
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: [paint, relatedPaint] }),
  );
  await page.goto("/marketplace");
  const search = page.getByLabel("Search materials catalogue");
  await search.fill("Interior Emulsion");
  await expect(page.locator(".product-suggestion-item")).toContainText(
    "Interior Emulsion",
  );
  await page.locator(".product-suggestion-item").first().click();
  await expect(page).toHaveURL(/\/product\/paint-family\?q=Interior/);
  await expect(
    page.getByRole("heading", { name: "Similar paints & wall prep products" }),
  ).toBeVisible();
  await expect(page.locator(".product-detail-price")).toContainText("₹187");
  await page.getByRole("button", { name: "4 L" }).click();
  await expect(page.locator(".product-detail-price")).toContainText("₹724");
  await expect(page.locator(".selected-size-badge")).toContainText("4 L");
  await page.getByRole("button", { name: "View product image 2" }).click();
  await expect(page.locator(".product-detail-image img")).toHaveAttribute(
    "src",
    "/images/categories/paints-category.webp",
  );
});

test("admin overview displays aggregate website activity and top products", async ({
  page,
}) => {
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "analytics-test-token" } }),
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
          pageViews: 87,
          productViews: 24,
          addToList: 8,
          requestHandoffs: 5,
        },
        daily: [
          {
            date: "2026-10-03",
            pageViews: 87,
            productViews: 24,
            addToList: 8,
            requestHandoffs: 5,
          },
        ],
        topPages: [{ page: "marketplace", views: 40 }],
        topProducts: [{ id: "pipe-1", name: "Astral CPVC Pipe", views: 12 }],
        privacy:
          "Aggregate event counts only; no visitor IDs, search terms, addresses, or contact details are stored.",
      },
    }),
  );
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Website activity · last 30 days" }),
  ).toBeVisible();
  await expect(page.getByText("87", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Astral CPVC Pipe", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/no visitor IDs/)).toBeVisible();
});

test("staff can review a customer contact and record a follow-up", async ({
  page,
}) => {
  const customerAccount = {
    ...customer,
    createdAt: "2026-10-01T10:00:00.000Z",
  };
  let savedFollowup: Record<string, unknown> | undefined;
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "workspace-test-token" } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Owner", role: "SUPER_ADMIN", isDemo: true },
    }),
  );
  await page.route("**/api/workspace/overview", (route) =>
    route.fulfill({
      json: {
        customers: 1,
        newCustomers30Days: 1,
        openFollowups: 0,
        closedFollowups: 0,
        demo: true,
      },
    }),
  );
  const customerRequests: string[] = [];
  await page.route("**/api/workspace/customers**", (route) => {
    const url = new URL(route.request().url());
    customerRequests.push(url.pathname);
    if (url.pathname.endsWith("/customer-1")) {
      return route.fulfill({ json: customerAccount });
    }
    return route.fulfill({
      json: { items: [customerAccount], total: 1, page: 1 },
    });
  });
  await page.route("**/api/workspace/followups*", async (route) => {
    if (route.request().method() === "POST") {
      savedFollowup = route.request().postDataJSON();
      await route.fulfill({ json: { ...savedFollowup, id: "followup-1" } });
      return;
    }
    await route.fulfill({ json: { items: [], total: 0, page: 1 } });
  });

  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page.getByRole("button", { name: "Customers", exact: true }).click();
  await page.getByRole("button", { name: "View contact" }).click();
  await expect
    .poll(() => customerRequests)
    .toContain("/api/workspace/customers/customer-1");
  await page.getByRole("button", { name: "Record follow-up" }).click();
  await expect(
    page.getByRole("heading", { name: "Record an enquiry" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save follow-up" }).click();
  await expect(
    page.getByText("Follow-up saved.", { exact: true }),
  ).toBeVisible();
  expect(savedFollowup).toMatchObject({
    customerName: "Test Customer",
    phone: "9876543210",
    source: "WHATSAPP",
    status: "NEW",
  });
});

test("staff website content edits publish to the public homepage", async ({
  page,
}) => {
  let savedContent = {
    ...SITE_CONTENT_DEFAULTS,
    "home.title": "Staff-updated headline\nUpdated second line",
  };
  let publishedPayload: typeof savedContent | undefined;
  await page.route("**/api/site-content", (route) =>
    route.fulfill({ json: savedContent }),
  );
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "content-test-token" } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Website Manager", role: "SUPER_ADMIN", isDemo: true },
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
  await page.route("**/api/admin/site-content/*", (route) => {
    if (route.request().method() === "PUT") {
      savedContent = route.request().postDataJSON();
    }
    if (route.request().url().endsWith("/publish")) {
      publishedPayload = route.request().postDataJSON();
      savedContent = publishedPayload!;
    }
    return route.fulfill({ json: savedContent });
  });

  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page.getByRole("button", { name: "Website pages & content" }).click();
  await expect(page.getByLabel("Main heading")).toHaveValue(
    "Staff-updated headline\nUpdated second line",
  );
  await page.getByLabel("Main heading").fill("Published by admin\nSecond line");
  await page
    .getByRole("textbox", { name: "privacy page heading", exact: true })
    .fill("Client privacy information");
  await page
    .getByRole("button", { name: "Add privacy section", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "privacy section 6 heading", exact: true })
    .fill("Client contact process");
  await page
    .getByRole("textbox", { name: "privacy section 6 text", exact: true })
    .fill("Contact the team for account information requests.");
  await page
    .getByLabel("Publish this privacy notice after client/legal approval")
    .check();
  await page
    .getByRole("button", { name: "Move privacy section 6 up", exact: true })
    .click();
  await page.getByRole("button", { name: "Add FAQ", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Question 1", exact: true })
    .fill("How do I request materials?");
  await page
    .getByRole("textbox", { name: "Answer 1", exact: true })
    .fill("Prepare your list and contact our team.");
  await page
    .getByRole("textbox", { name: "Homepage callout heading", exact: true })
    .fill("Send your material requirements");
  await page
    .getByLabel("Primary button label", { exact: true })
    .fill("Explore approved materials");
  await page
    .getByLabel("Primary button site path", { exact: true })
    .fill("/blogs");
  await page
    .getByLabel("Homepage callout button site path", { exact: true })
    .fill("/contact");
  await page
    .getByLabel("Menu label for marketplace", { exact: true })
    .fill("Browse materials");
  await page.getByLabel("Show Blogs menu link", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Add social link", exact: true })
    .click();
  await page.getByLabel("Link label", { exact: true }).fill("Client Instagram");
  await page
    .getByLabel("HTTPS address", { exact: true })
    .fill("https://instagram.com/client");
  await page
    .getByLabel("Homepage browser title", { exact: true })
    .fill("Client Materials Website");
  await page
    .getByRole("textbox", { name: "Default page description", exact: true })
    .fill("Client approved material catalogue description.");
  await page.getByLabel("Show Engineering guides", { exact: true }).uncheck();
  await page
    .getByRole("textbox", { name: "Label for wire guide", exact: true })
    .fill("Electrical design enquiries");
  await page
    .getByRole("textbox", { name: "Heading for wire guide", exact: true })
    .fill("Prepare an electrical design enquiry");
  await page
    .getByRole("textbox", {
      name: "Introduction for wire guide",
      exact: true,
    })
    .fill("Share the approved design details with the project professional.");
  await page
    .getByRole("checkbox", {
      name: "Show storage guide in Tools",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("button", { name: "Move Contact callout up", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move Contact callout down", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move Contact callout up", exact: true })
    .click();
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  const customBlock = page.locator(".homepage-content-block").first();
  await customBlock.getByRole("textbox").nth(0).fill("Site updates");
  await customBlock
    .getByRole("textbox")
    .nth(1)
    .fill("Read the latest customer information.");
  await customBlock.getByRole("textbox").nth(2).fill("Read our articles");
  await customBlock.getByRole("combobox").selectOption("/blogs");
  await customBlock.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator(".homepage-content-block")).toHaveCount(2);
  await page
    .locator(".homepage-content-block")
    .last()
    .getByRole("button", { name: "Move up" })
    .click();
  const duplicateBlock = page.locator(".homepage-content-block").first();
  await duplicateBlock
    .getByRole("checkbox", { name: "Show this section on the homepage" })
    .uncheck();
  await duplicateBlock.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator(".homepage-content-block")).toHaveCount(1);
  await page.getByRole("button", { name: "Preview draft", exact: true }).click();
  await expect(
    page.frameLocator('iframe[title="Customer website draft preview"]')
      .locator(".draft-preview-banner"),
  ).toContainText("Unpublished draft preview");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Website content published.",
  );
  expect(publishedPayload?.["home.title"]).toBe(
    "Published by admin\nSecond line",
  );
  expect(publishedPayload?.["home.hiddenSections"]).toBe("tools");
  expect(publishedPayload?.["home.primaryCtaLabel"]).toBe(
    "Explore approved materials",
  );
  expect(publishedPayload?.["home.primaryCtaPath"]).toBe("/blogs");
  expect(publishedPayload?.["home.calloutButtonPath"]).toBe("/contact");
  const publishedSocialLinks = JSON.parse(
    publishedPayload?.["footer.socialLinks"] || "[]",
  );
  expect(publishedSocialLinks).toHaveLength(1);
  expect(publishedSocialLinks[0]).toMatchObject({
    label: "Client Instagram",
    url: "https://instagram.com/client",
  });
  expect(publishedSocialLinks[0].id).toMatch(/^social-/);
  expect(publishedPayload?.["home.sectionOrder"]).toBe(
    "hero,trust,categories,brands,why,contact,tools,content",
  );
  expect(
    JSON.parse(publishedPayload?.["home.contentBlocks"] || "[]"),
  ).toMatchObject([
    {
      title: "Site updates",
      body: "Read the latest customer information.",
      buttonLabel: "Read our articles",
      buttonPath: "/blogs",
      visible: true,
    },
  ]);
  expect(publishedPayload?.["guides.tab.wire.title"]).toBe(
    "Prepare an electrical design enquiry",
  );
  expect(publishedPayload?.["guides.hiddenTabs"]).toBe("storage");

  await page.goto("http://127.0.0.1:4173/");
  await expect(
    page.getByText("Published by admin", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".home-tools-callout")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Send your material requirements",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Client Materials Website");
  await expect(
    page.getByRole("link", { name: "Explore approved materials" }),
  ).toHaveAttribute("href", "/blogs");
  await expect(
    page.getByRole("heading", { name: "Site updates", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read our articles", exact: true }),
  ).toHaveAttribute("href", "/blogs");
  await expect(
    page
      .getByRole("heading", { name: "Send your material requirements" })
      .locator("xpath=../..")
      .getByRole("link", { name: "Get a Quote" }),
  ).toHaveAttribute("href", "/contact");
  await expect(
    page
      .locator("footer")
      .getByRole("link", { name: "Browse materials", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("footer")
      .getByRole("link", { name: "Client Instagram", exact: true }),
  ).toHaveAttribute("href", "https://instagram.com/client");
  await expect(
    page
      .getByRole("navigation", { name: "Main Navigation" })
      .getByRole("link", { name: "Browse materials", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main Navigation" })
      .getByRole("link", { name: "Blogs", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Client approved material catalogue description.",
  );
  await page.goto("http://127.0.0.1:4173/contact");
  await expect(page).toHaveTitle(SITE_CONTENT_DEFAULTS["seo.contactTitle"]);
  await page.getByText("How do I request materials?", { exact: true }).click();
  await expect(
    page.getByText("Prepare your list and contact our team.", { exact: true }),
  ).toBeVisible();
  await page.goto("http://127.0.0.1:4173/privacy");
  await expect(
    page.getByRole("heading", {
      name: "Client privacy information",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Client contact process", exact: true }),
  ).toBeVisible();
  await page.goto("http://127.0.0.1:4173/guides");
  await expect(
    page.getByRole("button", { name: "Electrical design enquiries" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Prepare an electrical design enquiry",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Site Storage & Handling Rules" }),
  ).toHaveCount(0);
});

test("content staff preview a saved draft on the customer website without publishing", async ({
  page,
}) => {
  let draftContent = { ...SITE_CONTENT_DEFAULTS };
  let publishCalls = 0;
  let analyticsCalls = 0;
  await page.route("**/api/site-content", (route) =>
    route.fulfill({ json: SITE_CONTENT_DEFAULTS }),
  );
  await page.route("**/api/admin/site-content/*", (route) => {
    if (route.request().url().endsWith("/publish")) publishCalls += 1;
    if (route.request().method() === "PUT")
      draftContent = route.request().postDataJSON();
    return route.fulfill({ json: draftContent });
  });
  await page.route("**/api/analytics/events", (route) => {
    analyticsCalls += 1;
    return route.fulfill({ status: 204, body: "" });
  });
  await signIntoBusiness(page, "CONTENT_MANAGER");
  await page.getByRole("button", { name: "Website pages & content" }).click();
  await page.getByLabel("Main heading").fill("Private preview headline");
  await page
    .getByRole("button", { name: "Preview draft", exact: true })
    .click();

  const preview = page.frameLocator(
    'iframe[title="Customer website draft preview"]',
  );
  await expect(preview.locator(".draft-preview-banner")).toContainText(
    "Unpublished draft preview",
  );
  await expect(
    preview.getByRole("heading", { name: "Private preview headline" }),
  ).toBeVisible();
  expect(draftContent["home.title"]).toBe("Private preview headline");
  expect(publishCalls).toBe(0);
  expect(analyticsCalls).toBe(0);
});

test("content staff upload and publish a homepage hero image", async ({
  page,
}) => {
  let publishedContent = { ...SITE_CONTENT_DEFAULTS };
  await page.route("**/api/site-content", (route) =>
    route.fulfill({ json: publishedContent }),
  );
  await page.route("**/api/storage/images", (route) =>
    route.fulfill({
      json: { url: "https://cdn.example.test/images/home-hero.webp" },
    }),
  );
  await page.route("**/api/admin/site-content/*", (route) => {
    if (route.request().method() === "PUT") {
      publishedContent = route.request().postDataJSON();
    }
    if (route.request().url().endsWith("/publish")) {
      publishedContent = route.request().postDataJSON();
    }
    return route.fulfill({ json: publishedContent });
  });
  await signIntoBusiness(page, "CONTENT_MANAGER");
  await page.getByRole("button", { name: "Website pages & content" }).click();
  await page.getByLabel("Upload homepage hero banner image").setInputFiles({
    name: "home-hero.webp",
    mimeType: "image/webp",
    buffer: Buffer.from("mock image bytes"),
  });
  await expect(
    page.getByLabel("Homepage hero banner image", { exact: true }),
  ).toHaveValue("https://cdn.example.test/images/home-hero.webp");
  await page.getByRole("button", { name: "Preview draft", exact: true }).click();
  await expect(
    page.frameLocator('iframe[title="Customer website draft preview"]')
      .locator(".draft-preview-banner"),
  ).toContainText("Unpublished draft preview");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Website content published.",
  );
  expect(publishedContent["home.heroImage"]).toBe(
    "https://cdn.example.test/images/home-hero.webp",
  );

  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator(".home-hero-image")).toHaveAttribute(
    "src",
    "https://cdn.example.test/images/home-hero.webp",
  );
});

test("admin requires sign-in and displays login failures", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174");
  await expect(
    page.getByRole("button", { name: "Sign In to Workspace", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Mobile number or email", { exact: true })
    .fill("9000000000");
  await page.getByLabel("Password").fill("wrong-password");
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Invalid staff credentials" }),
    }),
  );
  await page
    .getByRole("button", { name: "Sign In to Workspace", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Invalid staff credentials");
  await expect(page.getByRole("navigation")).not.toBeVisible();
});

test("catalogue manager gets a first-product action when the catalogue is empty", async ({ page }) => {
  await page.route("**/api/auth/mode", (route) => route.fulfill({ json: { demo: true } }));
  await page.route("**/api/auth/staff/login", (route) => route.fulfill({ json: { accessToken: "catalogue-empty-token" } }));
  await page.route("**/api/auth/staff/me", (route) => route.fulfill({ json: { name: "Catalog Manager", role: "CATALOG_MANAGER", isDemo: true } }));
  await page.route("**/api/workspace/overview", (route) => route.fulfill({ json: { customers: 0, newCustomers30Days: 0, openFollowups: 0, closedFollowups: 0, demo: true } }));
  await page.route("**/api/analytics/overview**", (route) => route.fulfill({ json: { days: 30, totals: { pageViews: 0, productViews: 0, addToList: 0, requestHandoffs: 0 }, daily: [], topPages: [], topProducts: [], privacy: "Aggregate counts only." } }));
  await page.route("**/api/products/catalogue", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/products/catalogue/partner-brands", (route) => route.fulfill({ json: [] }));
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("catalog@example.test");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page.getByRole("button", { name: "Products, prices & offers" }).click();
  await expect(page.getByRole("heading", { name: "No catalogue products yet" })).toBeVisible();
  await expect(page.getByText(/No sample products are being shown/)).toHaveCount(0);
  await page.getByRole("button", { name: "Add first product" }).click();
  await expect(page.getByRole("heading", { name: "Add a product" })).toBeVisible();
});

test("admin edits customer-facing catalogue price and offer details", async ({
  page,
}) => {
  const original = {
    id: "listing-1",
    slug: "starter-cpvc",
    code: "MS-PIP-01",
    name: "Starter CPVC Pipe",
    brand: "Astral",
    brandTagline: "CPVC Pro",
    category: "pipes",
    categoryLabel: "Pipes & Fittings",
    unit: "3 m length",
    packaging: "Single length",
    image: "/images/products/cpvc-pipe-illustration.png",
    grade: "CPVC",
    description: "Product description",
    minOrderQty: "1 length",
    dispatchTime: "Confirm",
    price: "300",
    compareAtPrice: "350",
    priceNote: "per length, GST extra",
    offerLabel: "Offer",
    offerStartsAt: null,
    offerEndsAt: null,
    isInStock: true,
    availabilityStatus: "IN_STOCK",
    isPublished: true,
    features: ["Feature"],
    applications: ["Application"],
    specifications: { size: "25 mm" },
    sortOrder: 0,
  };
  let saved: Record<string, unknown> = original;
  let updatedBody: Record<string, unknown> | undefined;
  let uploadedAuthorization = "";
  const partnerBrands = [
    "UltraTech Cement",
    "Ambuja Cement",
    "JK Cement",
    "Shree Cement",
    "Astral Pipes",
    "Supreme Industries",
    "Finolex Pipes",
    "Zoloto Valves",
    "Polycab Wires",
    "Havells India",
    "Finolex Cables Limited",
    "Asian Paints",
    "Birla Opus Paints",
    "Jaquar Bath + Light",
    "CERA Sanitaryware",
    "Tata Tiscon",
    "MYK Laticrete",
  ].map((name, sortOrder) => ({
    id: `brand-${sortOrder}`,
    name,
    category: "Cement",
    tagline: "",
    isActive: true,
    sortOrder,
  }));
  let savedPartnerBrands = partnerBrands;
  let updatedPartnerBrands: typeof partnerBrands | undefined;
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "test-staff-token" } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Catalog Manager", role: "CATALOG_MANAGER", isDemo: true },
    }),
  );
  await page.route("**/api/workspace/overview", (route) =>
    route.fulfill({
      json: {
        customers: 1,
        newCustomers30Days: 1,
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
  await page.route("**/api/products/catalogue", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: [saved] });
    return route.fulfill({ status: 201, json: {} });
  });
  await page.route("**/api/products/catalogue/listing-1", (route) => {
    if (route.request().method() === "PATCH") {
      updatedBody = route.request().postDataJSON();
      saved = { ...original, ...updatedBody };
      return route.fulfill({ json: saved });
    }
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/products/catalogue/partner-brands", (route) => {
    if (route.request().method() === "PUT") {
      updatedPartnerBrands = route.request().postDataJSON();
      savedPartnerBrands = updatedPartnerBrands!;
    }
    return route.fulfill({ json: savedPartnerBrands });
  });
  await page.route("**/api/storage/images", (route) => {
    uploadedAuthorization = route.request().headers().authorization || "";
    return route.fulfill({
      json: {
        key: "images/test.png",
        url: "https://assets.example.test/images/test.png",
      },
    });
  });
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page.getByRole("button", { name: "Products, prices & offers" }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Price (₹ per unit)").fill("320");
  const storefrontPreview = page.getByRole("region", {
    name: "Customer storefront preview",
  });
  await expect(storefrontPreview).toBeVisible();
  await expect(storefrontPreview.getByText("₹320", { exact: true })).toBeVisible();
  await page.getByLabel("Compare-at price / MRP (₹, optional)").fill("400");
  await page.getByLabel("Price note").fill("per length, GST extra");
  await page.getByLabel("Offer label").fill("October offer");
  await page
    .locator('select[name="availabilityStatus"]')
    .selectOption("OUT_OF_STOCK");
  await page.getByLabel("Offer starts").fill("2026-10-05");
  await page.getByLabel("Offer ends").fill("2026-10-31");
  await page.locator(".catalogue-combination-axis input").nth(0).fill("Pack size");
  await page.locator(".catalogue-combination-axis input").nth(1).fill("1 L, 4 L, 10 L");
  await page.getByRole("button", { name: "Add option group" }).click();
  await page.locator(".catalogue-combination-axis input").nth(2).fill("Colour");
  await page.locator(".catalogue-combination-axis input").nth(3).fill("White, Black, Red, Yellow");
  await page.getByRole("button", { name: "Create combinations" }).click();
  await expect(page.getByText("12 / 1000 options", { exact: true })).toBeVisible();
  await expect(page.locator(".catalogue-variant-card")).toHaveCount(10);
  await page.getByRole("button", { name: "Next options page" }).click();
  await expect(page.locator(".catalogue-variant-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Previous options page" }).click();
  await page.getByPlaceholder("Find a colour, pack, code or option").fill("Yellow");
  await expect(page.locator(".catalogue-variant-card")).toHaveCount(3);
  await page.getByPlaceholder("Find a colour, pack, code or option").fill("");
  await expect(page.locator(".catalogue-variant-card")).toHaveCount(10);
  await page
    .locator(".catalogue-image-upload")
    .filter({ hasText: "Upload primary product image" })
    .locator('input[type="file"]')
    .setInputFiles({
      name: "product.png",
      mimeType: "image/png",
      buffer: Buffer.from("test image"),
    });
  await expect(page.locator('input[name="image"]')).toHaveValue(
    "https://assets.example.test/images/test.png",
  );
  await page.getByRole("button", { name: "View live preview" }).click();
  await expect(storefrontPreview.getByRole("heading", { name: "Starter CPVC Pipe" })).toBeVisible();
  await expect(storefrontPreview.getByText("October offer", { exact: true })).toBeVisible();
  await expect(storefrontPreview.getByText("Out of stock", { exact: true })).toBeVisible();
  await expect(storefrontPreview.getByText("₹320", { exact: true })).toBeVisible();
  await expect(storefrontPreview.getByText("per length, GST extra", { exact: true })).toBeVisible();
  expect(updatedBody).toBeUndefined();
  await storefrontPreview.getByRole("button", { name: "Product page" }).click();
  await storefrontPreview.getByRole("button", { name: "Mobile" }).click();
  await expect(page.locator(".preview-mobile .catalogue-preview-device-frame")).toBeVisible();
  await expect(storefrontPreview.getByRole("heading", { name: "Starter CPVC Pipe" })).toBeVisible();
  await expect(storefrontPreview.getByText("Specifications", { exact: true })).toBeVisible();
  await expect(storefrontPreview.getByText("Applications", { exact: true })).toBeVisible();
  await expect(storefrontPreview.getByText("1 L · White", { exact: true })).toBeVisible();
  expect(updatedBody).toBeUndefined();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Product saved and published",
  );
  expect(updatedBody).toMatchObject({
    price: 320,
    compareAtPrice: 400,
    offerLabel: "October offer",
    offerStartsAt: "2026-10-05",
    offerEndsAt: "2026-10-31",
    image: "https://assets.example.test/images/test.png",
    availabilityStatus: "OUT_OF_STOCK",
    isInStock: false,
  });
  expect(updatedBody?.variants).toHaveLength(12);
  expect(updatedBody?.variants).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: "1 L · White", unit: "3 m length", attributes: { "Pack size": "1 L", Colour: "White" }, price: null }),
    expect.objectContaining({ label: "10 L · Yellow", unit: "3 m length", attributes: { "Pack size": "10 L", Colour: "Yellow" }, price: null }),
  ]));
  expect(uploadedAuthorization).toBe("Bearer test-staff-token");
  await page.getByRole("button", { name: "Partner brands" }).click();
  await expect(page.getByText("17 brands", { exact: true })).toBeVisible();
  await page.getByLabel("Active in customer search").first().uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Active brands are now available",
  );
  expect(updatedPartnerBrands).toHaveLength(17);
  expect(updatedPartnerBrands?.[0].isActive).toBe(false);
});

test("owner creates staff accounts, assigns roles, disables access, and resets passwords", async ({
  page,
}) => {
  const owner = {
    id: "owner-1",
    name: "Material Square Owner",
    phone: "9876543210",
    email: "owner@example.com",
    role: "SUPER_ADMIN",
    isActive: true,
    isDemo: true,
    createdAt: "2026-10-01T00:00:00.000Z",
  };
  const roles = [
    {
      role: "CATALOG_MANAGER",
      label: "Catalogue & pricing manager",
      description: "Manages products",
      permissions: ["catalog.manage"],
    },
    {
      role: "SALES_MANAGER",
      label: "Sales & customer support",
      description: "Manages follow-ups",
      permissions: ["customers.read"],
    },
  ];
  let staffRows = [owner];
  let createdPayload: Record<string, unknown> | undefined;
  let roleUpdate: Record<string, unknown> | undefined;
  let disabledUpdate: Record<string, unknown> | undefined;
  let resetPayload: Record<string, unknown> | undefined;

  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "owner-token" } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({ json: owner }),
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
  await page.route("**/api/admin/staff/roles", (route) =>
    route.fulfill({ json: roles }),
  );
  await page.route("**/api/admin/staff", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: staffRows });
    createdPayload = route.request().postDataJSON();
    const created = {
      id: "staff-2",
      name: String(createdPayload.name),
      phone: String(createdPayload.phone),
      email: String(createdPayload.email),
      role: String(createdPayload.role),
      isActive: true,
      isDemo: true,
      createdAt: "2026-10-03T00:00:00.000Z",
    };
    staffRows = [...staffRows, created];
    return route.fulfill({ status: 201, json: created });
  });
  await page.route("**/api/admin/staff/staff-2", (route) => {
    const update = route.request().postDataJSON();
    if (typeof update.isActive === "boolean") disabledUpdate = update;
    else roleUpdate = update;
    staffRows = staffRows.map((staff) =>
      staff.id === "staff-2" ? { ...staff, ...update } : staff,
    );
    return route.fulfill({ json: staffRows[1] });
  });
  await page.route("**/api/admin/staff/staff-2/password", (route) => {
    resetPayload = route.request().postDataJSON();
    return route.fulfill({ json: { success: true } });
  });

  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByLabel("Password").fill("owner-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page.getByRole("button", { name: "Staff & Roles" }).click();
  await expect(
    page.getByRole("heading", { name: "Staff & roles" }),
  ).toBeVisible();
  await expect(page.getByText("Owner / Main client")).toBeVisible();
  await page.getByLabel("Full name").fill("Asha Manager");
  await page.getByLabel("Mobile number (optional)").fill("9876543211");
  await page.getByLabel("Email address (optional)").fill("asha@example.com");
  await page
    .getByRole("combobox", { name: "Role", exact: true })
    .selectOption("CATALOG_MANAGER");
  await page.getByLabel("Temporary password").fill("temporary-staff-password");
  await page.getByRole("button", { name: "Create staff account" }).click();
  await expect(page.getByRole("status")).toContainText("Staff account created");
  await expect(page.getByText("Asha Manager")).toBeVisible();
  await page.getByLabel("Role for Asha Manager").selectOption("SALES_MANAGER");
  await expect(page.getByRole("status")).toContainText("Staff access updated");
  const staffRow = page.getByRole("row").filter({ hasText: "Asha Manager" });
  await expect(staffRow.getByRole("button", { name: "Disable" })).toBeVisible();
  await staffRow.getByRole("button", { name: "Disable" }).click();
  await expect(page.getByRole("status")).toContainText("Staff access updated");
  await staffRow.getByRole("button", { name: "Reset password" }).click();
  await page
    .getByLabel("New password for Asha Manager")
    .fill("replacement-staff-password");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Password reset");
  expect(createdPayload).toMatchObject({
    name: "Asha Manager",
    phone: "9876543211",
    email: "asha@example.com",
    role: "CATALOG_MANAGER",
  });
  expect(roleUpdate).toEqual({ role: "SALES_MANAGER" });
  expect(disabledUpdate).toEqual({ isActive: false });
  expect(resetPayload).toEqual({ password: "replacement-staff-password" });
});

test("marketplace renders on a mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketplace");
  await expect(
    page.getByRole("heading", { name: "Construction Materials Catalog" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("marketplace keeps floating actions clear of product controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketplace");
  await expect(page.locator(".floating-action-dock")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Material List" })).toBeVisible();
});

test("marketplace displays published API product prices and offer labels", async ({
  page,
}) => {
  await page.route("**/api/products", (route) =>
    route.fulfill({
      json: [
        {
          id: "listed-product",
          code: "MS-TEST-1",
          name: "API Listed CPVC Pipe",
          brand: "Astral",
          category: "pipes",
          categoryLabel: "Pipes & Fittings",
          unit: "3 m length",
          image: "/images/products/cpvc-pipe-illustration.png",
          grade: "CPVC",
          features: [],
          applications: [],
          minOrderQty: "1 length",
          inStock: true,
          specs: {},
          price: "320.00",
          compareAtPrice: "400.00",
          priceNote: "per length, GST extra",
          offerLabel: "Launch offer",
        },
      ],
    }),
  );
  await page.goto("/marketplace");
  await expect(
    page.getByRole("heading", { name: "API Listed CPVC Pipe" }),
  ).toBeVisible();
  await expect(page.locator(".rate-amount")).toHaveText("₹320");
  await expect(page.locator(".catalogue-list-price")).toContainText("₹400");
  await expect(page.locator(".catalogue-list-price")).toContainText(
    "Launch offer",
  );
  await expect(page.locator(".catalogue-price-caveat")).toHaveText(
    "per length, GST extra",
  );
  await page.getByRole("button", { name: "View details" }).click();
  await expect(page).toHaveURL(/\/product\/listed-product$/);
  const detail = page.locator(".product-detail-information");
  await expect(
    detail.getByText("Technical & Testing Parameters", { exact: true }),
  ).toHaveCount(0);
  await expect(
    detail.getByText("Recommended Site Applications", { exact: true }),
  ).toHaveCount(0);
  await expect(
    detail.getByText("Performance Features", { exact: true }),
  ).toHaveCount(0);
});

test("marketplace keeps out-of-stock products visible and filters all availability states", async ({
  page,
}) => {
  const catalogue = [
    {
      id: "stocked",
      code: "P-1",
      name: "Paint available now",
      brand: "Colour Co",
      category: "paints",
      categoryLabel: "Paints",
      unit: "tin",
      features: [],
      applications: [],
      inStock: true,
      availabilityStatus: "IN_STOCK",
    },
    {
      id: "sold-out",
      code: "P-2",
      name: "Paint currently sold out",
      brand: "Colour Co",
      category: "paints",
      categoryLabel: "Paints",
      unit: "tin",
      features: [],
      applications: [],
      inStock: false,
      availabilityStatus: "OUT_OF_STOCK",
    },
    {
      id: "confirm-stock",
      code: "P-3",
      name: "Paint availability pending",
      brand: "Colour Co",
      category: "paints",
      categoryLabel: "Paints",
      unit: "tin",
      features: [],
      applications: [],
      inStock: false,
      availabilityStatus: "CHECK_AVAILABILITY",
    },
  ];
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: catalogue }),
  );
  await page.goto("/marketplace");

  for (const product of catalogue) {
    await expect(
      page.getByRole("heading", { name: product.name }),
    ).toBeVisible();
  }
  await page
    .getByLabel("Availability", { exact: true })
    .selectOption("OUT_OF_STOCK");
  await expect(
    page.getByRole("heading", { name: "Paint currently sold out" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Paint available now" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Paint availability pending" }),
  ).toHaveCount(0);

  await page
    .getByLabel("Availability", { exact: true })
    .selectOption("CHECK_AVAILABILITY");
  await expect(
    page.getByRole("heading", { name: "Paint availability pending" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Paint currently sold out" }),
  ).toHaveCount(0);
});

test("catalogue autocomplete and submitted search both match product specs and variant details", async ({
  page,
}) => {
  const catalogue = [
    {
      id: "paint-terracotta",
      code: "PAINT-EXT-01",
      name: "Exterior Weather Coat",
      brand: "Asian Paints",
      category: "paints",
      categoryLabel: "Paints",
      unit: "20 L bucket",
      packaging: "20 L bucket",
      features: ["Weather resistant"],
      applications: ["Exterior walls"],
      specs: { "Colour family": "Terracotta", finish: "Low sheen" },
      inStock: true,
      variants: [
        {
          id: "terra-low-sheen",
          code: "AP-TERRA-LS",
          label: "Terracotta · Low sheen",
          attributes: {
            Colour: "Terracotta",
            Finish: "Low sheen",
            Pack: "20 L",
          },
          unit: "bucket",
          inStock: true,
          sortOrder: 0,
        },
        {
          id: "black-waterproofing",
          code: "AP-BLACK-20L",
          label: "Black · 20 L",
          attributes: { Colour: "Black", Pack: "20 L" },
          unit: "bucket",
          inStock: false,
          availabilityStatus: "OUT_OF_STOCK",
          sortOrder: 1,
        },
      ],
    },
  ];
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: catalogue }),
  );
  await page.goto("/marketplace");

  const search = page.getByLabel("Search materials catalogue");
  await search.fill("Terracotta");
  await expect(page.locator(".product-suggestion-item")).toContainText(
    "Exterior Weather Coat",
  );
  await search.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Exterior Weather Coat" }),
  ).toBeVisible();

  await search.fill("Black");
  await expect(page.locator(".product-suggestion-item")).toContainText("Out of stock");
  await search.press("Enter");
  await expect(page).toHaveURL(/marketplace\?q=Black/);
  await expect(page.locator(".stock-status-tag")).toContainText("Out of stock");
  await page.getByRole("link", { name: "Exterior Weather Coat", exact: true }).click();
  await expect(page.locator(".selected-size-badge")).toContainText("Black");

  await page.goto("/marketplace");
  await search.fill("finish");
  await expect(page.locator(".product-suggestion-item")).toContainText(
    "Exterior Weather Coat",
  );
});

test("partner brand search keeps all seventeen brands discoverable and lets customers browse related catalogue items", async ({
  page,
}) => {
  const catalogue = [
    {
      id: "ultratech-ppc",
      code: "UTC-PPC",
      name: "UltraTech PPC Cement",
      brand: "UltraTech Cement",
      category: "cement",
      categoryLabel: "Cement & Aggregates",
      unit: "50 kg bag",
      packaging: "50 kg bag",
      features: [],
      applications: [],
      specs: {},
      inStock: true,
      availabilityStatus: "IN_STOCK",
      variants: [],
    },
    {
      id: "ambuja-opc",
      code: "AMB-OPC",
      name: "Ambuja OPC Cement",
      brand: "Ambuja Cement",
      category: "cement",
      categoryLabel: "Cement & Aggregates",
      unit: "50 kg bag",
      packaging: "50 kg bag",
      features: [],
      applications: [],
      specs: {},
      inStock: false,
      availabilityStatus: "CHECK_AVAILABILITY",
      variants: [],
    },
  ];
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: catalogue }),
  );
  await page.goto("/marketplace");
  await expect(page.locator(".brand-partner-card")).toHaveCount(17);
  const search = page.getByLabel("Search materials catalogue");
  await search.fill("UltraTech Cement");
  await expect(page.locator(".product-suggestion-item")).toContainText(
    "UltraTech PPC Cement",
  );
  const brandSuggestion = page
    .locator(".brand-suggestion-item")
    .filter({ hasText: "UltraTech Cement" })
    .first();
  await expect(brandSuggestion).toBeVisible();
  await brandSuggestion.click();
  await expect(
    page.getByRole("heading", { name: "UltraTech PPC Cement" }),
  ).toBeVisible();
  await expect(page.locator(".brand-partner-card")).toHaveCount(0);
  await page
    .getByRole("link", { name: "UltraTech PPC Cement", exact: true })
    .click();
  await expect(page).toHaveURL(/\/product\/ultratech-ppc\?q=UltraTech%20Cement$/);
  await expect(
    page.getByRole("heading", { name: "Similar cement & aggregates products" }),
  ).toBeVisible();
  await page
    .locator(".product-related-card")
    .filter({ hasText: "Ambuja OPC Cement" })
    .click();
  await expect(page).toHaveURL(/\/product\/ambuja-opc$/);
  await expect(
    page.getByRole("heading", { name: "Ambuja OPC Cement" }),
  ).toBeVisible();
});

test("request screen fits mobile and keeps quotation preview account-gated", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("material-square-bom"));
  await page.goto("/get-quote");
  await page.getByPlaceholder("Material name", { exact: true }).fill("Cement");
  await page.getByRole("button", { name: "Add custom material" }).click();
  await page.getByLabel("Full name").fill("Test Customer");
  await page
    .getByLabel("Site / delivery address — building, street and locality")
    .fill("Plot 42, Sector 10");
  await page.getByLabel("City").fill("Noida");
  await page.getByLabel("PIN code").fill("201301");
  await page.getByRole("button", { name: "Preview request" }).click();
  await expect(
    page.getByRole("heading", { name: "Review your quotation request" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue in WhatsApp" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("material-square-request-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("material-square-request-mobile.png"),
    fullPage: true,
  });
});
test("different pipe sizes remain separate after refresh and in request preview", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("material-square-bom"));
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: [publishedPipe] }),
  );
  await page.goto("/marketplace");
  const card = page
    .locator(".catalog-product-card")
    .filter({ hasText: "CPVC Pro" })
    .first();
  await card.getByRole("button", { name: "Choose options" }).click();
  await expect(page).toHaveURL(/\/product\/.*pipe/);
  await page.getByLabel("Required size / specification").fill("3/4 inch");
  await page.getByLabel(/Quantity \(/).fill("20");
  await page.getByRole("button", { name: "Add to Material List" }).click();
  await page.getByLabel("Required size / specification").fill("1 inch");
  await page.getByLabel(/Quantity \(/).fill("10");
  await page.getByRole("button", { name: "Add to Material List" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("material-square-product-mobile.png"),
  });
  expect(
    await page
      .locator(".product-detail-card")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole("link", { name: /Review list/ }).click();
  await expect(page).toHaveURL(/\/material-list$/);
  await expect(
    page.getByRole("heading", { name: "Review your Material List" }),
  ).toBeVisible();
  await page.goto("/get-quote");
  await expect(page.locator(".material-editor")).toHaveCount(2);
  await page.getByLabel("Full name").fill("Test Customer");
  await page
    .getByLabel("Site / delivery address — building, street and locality")
    .fill("Plot 42, Sector 10");
  await page.getByLabel("City").fill("Noida");
  await page.getByLabel("PIN code").fill("201301");
  await page.getByRole("button", { name: "Preview request" }).click();
  const message = await page.locator(".request-preview").textContent();
  expect(message).not.toBeNull();
  expect(message).toContain("3/4 inch");
  expect(message).toContain("1 inch");
  expect(message).toContain("20");
  expect(message).toContain("10");
});

test("material list keeps selected product variants, units, prices and minimum quantities aligned", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("material-square-bom"));
  await page.route("**/api/products", (route) => route.fulfill({ json: [{
    id: "asian-paints-damp-proof",
    code: "AP-DP-01",
    name: "Asian Paints SmartCare Damp Proof",
    brand: "Asian Paints",
    category: "paints",
    categoryLabel: "Paints & Waterproofing",
    unit: "can",
    packaging: "Waterproofing coating",
    features: [],
    applications: [],
    specs: {},
    inStock: false,
    availabilityStatus: "OUT_OF_STOCK",
    variants: [
      { id: "damp-white-1l", label: "1 L", attributes: { "Pack size": "1 L", Colour: "White" }, unit: "can", price: 500, inStock: true, availabilityStatus: "IN_STOCK", minOrderQuantity: 2, sortOrder: 0 },
      { id: "damp-black-4l", label: "4 L", attributes: { "Pack size": "4 L", Colour: "Black" }, unit: "can", price: 1800, inStock: true, availabilityStatus: "IN_STOCK", minOrderQuantity: 1, sortOrder: 1 },
    ],
  }] }));
  await page.goto("/marketplace");
  const card = page.locator(".catalog-product-card").filter({ hasText: "Asian Paints SmartCare Damp Proof" });
  await card.getByRole("button", { name: "Choose options" }).click();
  await expect(page).toHaveURL(/\/product\/asian-paints-damp-proof/);
  await expect(page.getByLabel("Quantity (can)")).toHaveValue("2");
  await page.getByRole("button", { name: /Add to Material List/ }).click();
  await page.locator(".product-option-group").filter({ hasText: "Colour" }).getByRole("button", { name: "Black" }).click();
  await expect(page.locator(".selected-size-badge")).toContainText("Black");
  await page.getByLabel("Quantity (can)").fill("1");
  await page.getByRole("button", { name: /Add to Material List/ }).click();
  await page.getByRole("link", { name: /Review list/ }).click();
  await expect(page.locator(".material-editor")).toHaveCount(2);
  await expect(page.getByLabel("Product option for Asian Paints SmartCare Damp Proof").first()).toHaveValue("damp-white-1l");
  await expect(page.getByLabel("Product option for Asian Paints SmartCare Damp Proof").nth(1)).toHaveValue("damp-black-4l");
  await expect(page.getByLabel("Unit for Asian Paints SmartCare Damp Proof").first()).toBeDisabled();
  await expect(page.getByLabel("Selected product option").first()).toHaveAttribute("readonly", "");
  await expect(page.locator(".material-editor").first()).toContainText("₹500 / can");
  await expect(page.locator(".material-editor").nth(1)).toContainText("₹1,800 / can");
  await expect(page.locator(".material-editor").first()).toContainText("Minimum order for this option: 2 can");
  await expect(page.getByLabel("Quantity for Asian Paints SmartCare Damp Proof").first()).toHaveAttribute("min", "2");
  let submittedRfq: Record<string, any> | undefined;
  await page.route("**/api/customer/rfqs", async (route) => {
    submittedRfq = route.request().postDataJSON();
    await route.fulfill({ status: 401, json: { message: "Sign in to continue." } });
  });
  await page.goto("/get-quote");
  await page.getByLabel("Quantity for Asian Paints SmartCare Damp Proof").first().fill("1");
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Site / delivery address — building, street and locality").fill("Plot 42, Sector 10");
  await page.getByLabel("City").fill("Noida");
  await page.getByLabel("PIN code").fill("201301");
  await page.getByRole("button", { name: "Preview request" }).click();
  await page.getByRole("button", { name: "Verify phone & request quotation" }).click();
  await expect(page.getByRole("alert")).toContainText("requires a minimum of 2 can");
  expect(submittedRfq).toBeUndefined();
  await page.getByLabel("Quantity for Asian Paints SmartCare Damp Proof").first().fill("2");
  await page.getByRole("button", { name: "Preview request" }).click();
  await page.getByRole("button", { name: "Verify phone & request quotation" }).click();
  await expect(page).toHaveURL(/\/account$/);
  expect(submittedRfq?.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ catalogueId: "asian-paints-damp-proof", variantId: "damp-white-1l", quantity: 2, unit: "can", specification: expect.stringContaining("1 L") }),
    expect.objectContaining({ catalogueId: "asian-paints-damp-proof", variantId: "damp-black-4l", quantity: 1, unit: "can", specification: expect.stringContaining("Black") }),
  ]));
});

test("catalogue API outage leaves the guest request form usable", async ({
  page,
}) => {
  let catalogueRequests = 0;
  await page.route("**/api/products", (route) => {
    catalogueRequests += 1;
    return route.fulfill({ status: 503, body: "" });
  });
  await page.goto("/get-quote");
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preview request" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Sign in with your mobile" }),
  ).not.toBeVisible();
  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: "Published inventory is temporarily unavailable" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No products match your search" })).toHaveCount(0);
  const requestsBeforeRetry = catalogueRequests;
  await page.getByRole("button", { name: "Retry inventory" }).click();
  await expect.poll(() => catalogueRequests).toBeGreaterThan(requestsBeforeRetry);
  await expect(page.getByRole("heading", { name: "Published inventory is temporarily unavailable" })).toBeVisible();
  await page.goto("/product/not-currently-loaded");
  await expect(page.getByRole("heading", { name: "We couldn’t load the published inventory." })).toBeVisible();
});
test("unpublished privacy and terms drafts stay hidden from visitors", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy information" }),
  ).toBeVisible();
  await expect(
    page.getByText("This information is being reviewed and is not published yet."),
  ).toBeVisible();
  await expect(page.locator("footer").getByRole("link", { name: "Privacy" })).toHaveCount(0);
  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Website terms" }),
  ).toBeVisible();
  await expect(page.getByText("This information is being reviewed and is not published yet.")).toBeVisible();
  await expect(page.locator("footer").getByRole("link", { name: "Website terms" })).toHaveCount(0);
});

test("technical guides disclose review limits and contact page avoids unsupported delivery claims", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText(/calculate exact conductor gauge/i),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wire Selection Checklist" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open wire selection checklist" }),
  ).toHaveAttribute("href", "/guides?tab=wire");
  await expect(page.getByText(/procurement desk/i)).not.toBeVisible();
  await page.goto("/guides");
  await expect(page.getByRole("note")).toContainText(
    "Professional verification required",
  );
  await expect(page.getByText(/100% electrical safety/i)).not.toBeVisible();
  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { name: "Tell us what your site needs." }),
  ).toBeVisible();
  await expect(page.getByText(/10k\+ Delhi NCR builders/i)).not.toBeVisible();
  await expect(page.getByText(/guaranteed arrival/i)).not.toBeVisible();
});

test("sales staff can update a website request status in the RFQ inbox", async ({
  page,
}) => {
  let status = "NEW";
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "sales-token" } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Sales Staff", role: "SALES_MANAGER", isDemo: true },
    }),
  );
  await page.route("**/api/workspace/overview", (route) =>
    route.fulfill({
      json: {
        customers: 1,
        newCustomers30Days: 1,
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
  await page.route("**/api/analytics/dashboard", (route) =>
    route.fulfill({
      json: {
        currentMonthOrderValueInr: 0,
        activeRfqsCount: 1,
        dailyOrderValue: [],
      },
    }),
  );
  await page.route("**/api/rfqs", (route) =>
    route.fulfill({
      json: [
        {
          id: "rfq-test",
          customerName: "Test Customer",
          customerPhone: "9876543210",
          siteLocation: "Noida",
          status,
          items: [
            {
              material: "Pipe",
              brand: "Astral",
              quantity: 20,
              unit: "Pieces",
              specification: "3/4 inch",
            },
          ],
        },
      ],
    }),
  );
  await page.route("**/api/rfqs/rfq-test/status", (route) => {
    status = route.request().postDataJSON().status;
    return route.fulfill({ json: { id: "rfq-test", status } });
  });
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("sales@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page
    .getByRole("button", { name: "Quotations & orders", exact: true })
    .click();
  await page.getByRole("button", { name: "RFQ inbox", exact: true }).click();
  await expect(
    page.getByText("Pipe · Astral — 20 Pieces · 3/4 inch"),
  ).toBeVisible();
  await page.getByLabel("Request status").selectOption("CONTACTED");
  await expect(page.getByLabel("Request status")).toHaveValue("CONTACTED");
  expect(status).toBe("CONTACTED");
});

test("sales staff create a multi-material quotation with catalogue packs and real units", async ({
  page,
}) => {
  let saved: Record<string, any> | undefined;
  await page.route("**/api/analytics/dashboard", (route) =>
    route.fulfill({
      json: {
        currentMonthOrderValueInr: 0,
        activeRfqsCount: 0,
        dailyOrderValue: [],
      },
    }),
  );
  await page.route("**/api/quotes", (route) => {
    if (route.request().method() === "POST") {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { id: "new-quote" } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/api/products/inventory", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/products/catalogue", (route) =>
    route.fulfill({
      json: [
        {
          id: "pipes",
          name: "CPVC Pipe",
          brand: "Astral",
          unit: "family",
          price: null,
          variants: [
            { id: "25mm", label: "25 mm × 3 m", unit: "length", price: "320" },
          ],
        },
        {
          id: "cement",
          name: "Cement",
          brand: "UltraTech",
          unit: "50 kg bag",
          price: "400",
          variants: [],
        },
      ],
    }),
  );
  await signIntoBusiness(page, "SALES_MANAGER");
  await page
    .getByRole("button", { name: "Quotations & orders", exact: true })
    .click();
  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.getByLabel("Customer name", { exact: true }).fill("Test Buyer");
  await page.getByLabel("Mobile number", { exact: true }).fill("9876543210");
  await page
    .getByLabel("Delivery address", { exact: true })
    .fill("Noida sector 10");
  await page.getByLabel("PIN code", { exact: true }).fill("201301");
  await page
    .getByRole("combobox", { name: "Product for line 1", exact: true })
    .selectOption("variant:25mm");
  await expect(page.getByLabel("Rate for line 1 per length")).toHaveValue(
    "320",
  );
  await page.getByLabel("Quantity for line 1 (length)").fill("20");
  await page.getByLabel("Rate for line 1 per length").fill("300");
  await page.getByRole("button", { name: "Add quotation line" }).click();
  await page.getByLabel("Search quotation products").fill("UltraTech");
  await expect(
    page.getByRole("combobox", { name: "Product for line 1", exact: true }),
  ).toHaveValue("variant:25mm");
  await page
    .getByRole("combobox", { name: "Product for line 2", exact: true })
    .selectOption("catalogue:cement");
  await page.getByLabel("Quantity for line 2 (50 kg bag)").fill("10");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByLabel("Customer name", { exact: true })).toHaveValue(
    "",
  );
  expect(saved?.items).toEqual([
    {
      catalogueId: "pipes",
      variantId: "25mm",
      quantity: 20,
      unitPrice: 300,
      specification: "",
      alternatives: [],
    },
    {
      catalogueId: "cement",
      quantity: 10,
      unitPrice: 400,
      specification: "",
      alternatives: [],
    },
  ]);
});

for (const editing of [false, true])
  test(
    editing
      ? "sales staff edit saved quotation drafts"
      : "sales staff prepare linked quotation revisions with original quantities and rates",
    async ({ page }) => {
      let saved: Record<string, any> | undefined;
      const quote = {
        id: "original",
        quoteNumber: "MS-QT-ORIGINAL",
        revisionNumber: 1,
        status: editing ? "DRAFT" : "QUOTE_SENT",
        customerName: "Test Buyer",
        customerPhone: "9876543210",
        projectSiteAddress: "Noida sector 10",
        sitePincode: "201301",
        subtotal: "4000",
        marginAmount: "0",
        discountAmount: "0",
        taxAmount: "720",
        freightAmount: "100",
        totalAmount: "4820",
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        items: [
          {
            id: "line1",
            catalogueId: "cement",
            productName: "Cement",
            brandName: "UltraTech",
            unit: "50 kg bag",
            quantityMt: "10",
            unitPrice: "400",
            lineTotal: "4000",
            specification: "Site use",
          },
        ],
      };
      await page.route("**/api/analytics/dashboard", (route) =>
        route.fulfill({
          json: {
            currentMonthOrderValueInr: 0,
            activeRfqsCount: 0,
            dailyOrderValue: [],
          },
        }),
      );
      await page.route("**/api/quotes", (route) =>
        route.fulfill({ json: [quote] }),
      );
      await page.route(
        editing ? "**/api/quotes/original" : "**/api/quotes/original/revisions",
        (route) => {
          saved = route.request().postDataJSON();
          return route.fulfill({ json: { id: "replacement" } });
        },
      );
      await page.route("**/api/products/inventory", (route) =>
        route.fulfill({ json: [] }),
      );
      await page.route("**/api/products/catalogue", (route) =>
        route.fulfill({
          json: [
            {
              id: "cement",
              name: "Cement",
              brand: "UltraTech",
              unit: "50 kg bag",
              price: "500",
              variants: [],
            },
          ],
        }),
      );
      await signIntoBusiness(page, "SALES_MANAGER");
      await page
        .getByRole("button", { name: "Quotations & orders", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Quotations", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: editing ? "Edit draft" : "Prepare revision",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name: editing ? "Edit quotation draft" : "Revise quotation",
        }),
      ).toBeVisible();
      await expect(
        page.getByLabel("Mobile number", { exact: true }),
      ).toHaveAttribute("readonly", "");
      await expect(
        page.getByLabel("Rate for line 1 per 50 kg bag"),
      ).toHaveValue("400");
      await page.getByLabel("Quantity for line 1 (50 kg bag)").fill("20");
      await page
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Create quotation" }),
      ).toBeVisible();
      expect(saved?.items).toEqual([
        {
          catalogueId: "cement",
          quantity: 20,
          unitPrice: 400,
          specification: "Site use",
          alternatives: [],
        },
      ]);
      expect(saved?.taxPct).toBe(18);
      expect(saved?.customerPhone).toBe(quote.customerPhone);
    },
  );

async function signIntoBusiness(
  page: import("@playwright/test").Page,
  role: string,
) {
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({ json: { accessToken: "business-test-token" } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({ json: { name: "Business Staff", role, isDemo: true } }),
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
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("staff@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page
    .getByRole("button", { name: "Business management", exact: true })
    .click();
}

test("procurement staff create an internal purchase request", async ({
  page,
}) => {
  let created: Record<string, unknown> | undefined;
  await page.route("**/api/suppliers", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/procurement", (route) => {
    if (route.request().method() === "POST") {
      created = route.request().postDataJSON();
      return route.fulfill({ json: { id: "request-new" } });
    }
    return route.fulfill({ json: [] });
  });
  await signIntoBusiness(page, "PROCUREMENT_HEAD");
  await page.getByRole("button", { name: "Procurement", exact: true }).click();
  await page.getByLabel("Delivery address").fill("Plot 14, Sector 10");
  await page.getByLabel("City", { exact: true }).fill("Noida");
  await page.getByLabel("PIN code").fill("201301");
  await page.getByLabel("Product", { exact: true }).fill("CPVC pipe");
  await page.getByLabel("Brand (optional)").fill("Astral");
  await page.getByLabel("Category", { exact: true }).fill("Pipes");
  await page.getByLabel("Quantity", { exact: true }).fill("20");
  await page.getByLabel("Unit", { exact: true }).fill("lengths");
  await page
    .getByRole("button", { name: "Create purchase request", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  expect(created).toMatchObject({
    deliveryAddress: "Plot 14, Sector 10",
    deliveryCity: "Noida",
    deliveryPincode: "201301",
    items: [
      {
        productName: "CPVC pipe",
        brand: "Astral",
        category: "Pipes",
        quantity: 20,
        unit: "lengths",
      },
    ],
  });
});

test("dispatch staff create an order delivery plan and challan", async ({
  page,
}) => {
  let plan: Record<string, unknown> | undefined;
  let challan: Record<string, unknown> | undefined;
  await page.route("**/api/transportation", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/transportation/order-1", (route) => {
    plan = route.request().postDataJSON();
    return route.fulfill({ json: { id: "plan-1", ...plan } });
  });
  await page.route("**/api/orders/order-1/dispatch-challan", (route) => {
    challan = route.request().postDataJSON();
    return route.fulfill({ json: { id: "challan-1" } });
  });
  await signIntoBusiness(page, "DISPATCH_OFFICER");
  await expect(page.getByLabel("Destination")).toBeVisible();
  await page.getByLabel("Order ID").nth(0).fill("order-1");
  await page.getByLabel("Destination").fill("Plot 14, Sector 10, Noida");
  await page.getByLabel("Transporter").fill("Local Fleet");
  await page.getByLabel("Vehicle number").fill("UP16TEST");
  await page.getByLabel("Driver name").nth(0).fill("Test Driver");
  await page.getByLabel("Driver phone").nth(0).fill("9876543210");
  await page.getByLabel("Estimated arrival").nth(0).fill("2026-10-10T10:30");
  await page.getByRole("button", { name: "Save delivery plan" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  expect(plan).toMatchObject({
    destination: "Plot 14, Sector 10, Noida",
    transporter: "Local Fleet",
    vehicleNumber: "UP16TEST",
    driverName: "Test Driver",
    driverPhone: "9876543210",
    status: "PLANNED",
  });

  await page.getByLabel("Order ID").nth(1).fill("order-1");
  await page.getByLabel("Truck number").fill("UP16TEST");
  await page.getByLabel("Driver name").nth(1).fill("Test Driver");
  await page.getByLabel("Driver phone").nth(1).fill("9876543210");
  await page.getByLabel("Gross vehicle weight (kg)").fill("12000");
  await page.getByLabel("Tare weight (kg)").fill("5000");
  await page.getByLabel("Estimated arrival").nth(1).fill("2026-10-10T10:30");
  await page.getByRole("button", { name: "Issue delivery challan" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  expect(challan).toMatchObject({
    truckNumber: "UP16TEST",
    driverName: "Test Driver",
    driverPhone: "9876543210",
    weighbridgeGrossKg: 12000,
    weighbridgeTareKg: 5000,
  });
});

test("operational sales report filters by date and exports sanitized CSV", async ({
  page,
}) => {
  let requestedRange: URL | undefined;
  await page.route("**/api/reports/sales**", (route) => {
    requestedRange = new URL(route.request().url());
    return route.fulfill({
      json: {
        from: "2026-10-01",
        to: "2026-10-03",
        summary: {
          orderCount: 1,
          activeOrderCount: 1,
          recordedOrderValueInr: 2500,
          quotationCount: 1,
          acceptedQuotationCount: 1,
        },
        orders: [
          {
            orderNumber: "=2+2",
            status: "IN_TRANSIT",
            createdAt: "2026-10-02T10:00:00.000Z",
            recordedValueInr: 2500,
            itemCount: 2,
          },
        ],
        quotations: [
          {
            quoteNumber: "MS-QT-2026-1",
            revisionNumber: 1,
            status: "ACCEPTED",
            createdAt: "2026-10-01T10:00:00.000Z",
            validUntil: "2026-10-03T10:00:00.000Z",
            recordedValueInr: 2500,
            itemCount: 2,
          },
        ],
        orderStatus: [],
        quotationStatus: [],
        truncated: false,
        rowLimit: 500,
        note: "Reported amounts reflect saved order and quotation documents.",
      },
    });
  });
  await signIntoBusiness(page, "SALES_MANAGER");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Operational reports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Operational reports", exact: true }),
  ).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("2026-10-01");
  await page.getByLabel("To", { exact: true }).fill("2026-10-03");
  await page.getByRole("button", { name: "Apply dates" }).click();
  await expect(page.getByText("=2+2", { exact: true })).toBeVisible();
  expect(requestedRange?.searchParams.get("from")).toBe("2026-10-01");
  expect(requestedRange?.searchParams.get("to")).toBe("2026-10-03");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("material-square-sales-");
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain('"\'=2+2"');
  expect(csv).toContain("MS-QT-2026-1");
  expect(csv).not.toContain("customerPhone");
});

test("sales staff record external quotation acceptance and comparison choice", async ({
  page,
}) => {
  let quoteStatus = "QUOTE_SENT";
  let recorded: Record<string, unknown> | undefined;
  await page.route("**/api/analytics/dashboard", (route) =>
    route.fulfill({
      json: {
        currentMonthOrderValueInr: 0,
        activeRfqsCount: 0,
        dailyOrderValue: [],
      },
    }),
  );
  await page.route("**/api/quotes", (route) =>
    route.fulfill({
      json: [
        {
          id: "external-quote",
          quoteNumber: "MS-QT-EXTERNAL",
          revisionNumber: 1,
          status: quoteStatus,
          customerName: "Test Buyer",
          customerPhone: "9876543210",
          totalAmount: "1180",
          subtotal: "1000",
          discountAmount: "0",
          marginAmount: "0",
          taxAmount: "180",
          freightAmount: "0",
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          projectSiteAddress: "Noida sector 10",
          sitePincode: "201301",
          items: [
            {
              id: "material-line",
              productName: "CPVC Pipe",
              brandName: "Brand A",
              specification: "25 mm",
              quantityMt: "10",
              unit: "length",
              unitPrice: "100",
              lineTotal: "1000",
              options: [
                {
                  id: "alternative-brand",
                  productName: "CPVC Pipe",
                  brandName: "Brand B",
                  specification: "25 mm",
                  unit: "length",
                  unitPrice: "110",
                  lineTotal: "1100",
                },
              ],
            },
          ],
        },
      ],
    }),
  );
  await page.route("**/api/products/inventory", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/quotes/external-quote/acceptance", (route) => {
    recorded = route.request().postDataJSON();
    quoteStatus = "CONVERTED_TO_ORDER";
    return route.fulfill({
      json: {
        decision: "ACCEPT",
        orderNumber: "MS-ORD-EXTERNAL",
        procurementNumber: "MS-PR-EXTERNAL",
      },
    });
  });

  await signIntoBusiness(page, "SALES_MANAGER");
  await page
    .getByRole("button", { name: "Quotations & orders", exact: true })
    .click();
  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page
    .getByLabel("Acceptance channel for MS-QT-EXTERNAL", { exact: true })
    .selectOption("WHATSAPP");
  await page
    .getByLabel("Accepted option for CPVC Pipe", { exact: true })
    .selectOption("alternative-brand");
  await page
    .getByRole("button", { name: "Record customer acceptance", exact: true })
    .click();

  await expect
    .poll(() => recorded)
    .toEqual({
      channel: "WHATSAPP",
      selections: [{ itemId: "material-line", optionId: "alternative-brand" }],
    });
  await expect(
    page.getByText(/MS-QT-EXTERNAL · Revision 1 · CONVERTED_TO_ORDER/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record customer acceptance" }),
  ).toHaveCount(0);
});

test("sales staff can update centralized quotation validity and notification rules", async ({
  page,
}) => {
  let settings = {
    id: "global",
    quotationValidityHours: 48,
    sendQuotePublishedNotification: true,
    sendQuoteExpiryReminder: true,
    expiryReminderHoursBefore: 24,
  };
  let saved: typeof settings | undefined;
  await page.route("**/api/quotes", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/admin/business-rules", (route) => {
    if (route.request().method() === "PUT") {
      saved = route.request().postDataJSON();
      settings = { ...settings, ...saved };
    }
    return route.fulfill({ json: settings });
  });
  await signIntoBusiness(page, "SALES_MANAGER");
  await page
    .getByRole("button", { name: "Quotation rules", exact: true })
    .click();
  await expect(page.getByLabel("Quotation validity (hours)")).toHaveValue("48");
  await page.getByLabel("Quotation validity (hours)").fill("72");
  await page.getByLabel("Reminder lead time (hours)").fill("12");
  await page
    .getByLabel("Queue a customer notification when a quotation is published")
    .uncheck();
  await page.getByRole("button", { name: "Save quotation rules" }).click();
  await expect.poll(() => saved?.quotationValidityHours).toBe(72);
  expect(saved).toEqual({
    quotationValidityHours: 72,
    sendQuotePublishedNotification: false,
    sendQuoteExpiryReminder: true,
    expiryReminderHoursBefore: 12,
  });
});

test("procurement staff edit supplier business details and service areas", async ({
  page,
}) => {
  let supplier = {
    id: "supplier-1",
    name: "Supplier One",
    legalName: "Supplier One Ltd",
    gstin: "",
    phone: "9876543210",
    email: "supplier@example.com",
    address: "Industrial Area",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    servicePincodes: ["201301"],
    status: "ACTIVE",
    notes: "",
  };
  await page.route("**/api/suppliers", (route) =>
    route.fulfill({ json: [supplier] }),
  );
  await page.route("**/api/suppliers/supplier-1", (route) => {
    supplier = { ...supplier, ...route.request().postDataJSON() };
    return route.fulfill({ json: supplier });
  });
  await signIntoBusiness(page, "PROCUREMENT_HEAD");
  await page
    .getByRole("button", { name: "Edit supplier", exact: true })
    .click();
  await expect(page.getByLabel("Legal name", { exact: true })).toHaveValue(
    "Supplier One Ltd",
  );
  await page.getByLabel("City", { exact: true }).fill("Ghaziabad");
  await page
    .getByLabel("Service PIN codes (comma separated)")
    .fill("201301, 201310");
  await page.getByLabel("Supplier status").selectOption("SUSPENDED");
  await page.getByRole("button", { name: "Save supplier changes" }).click();
  await expect(
    page.getByText("Ghaziabad · 201301 · 0 listed products"),
  ).toBeVisible();
  expect(supplier.status).toBe("SUSPENDED");
  expect(supplier.servicePincodes).toEqual(["201301", "201310"]);
});

test("content staff edit a provider and clear optional details before publishing", async ({
  page,
}) => {
  let provider = {
    id: "expert-1",
    name: "Project Advisor",
    serviceType: "Architecture",
    expertise: "Site planning",
    phone: "9876543210",
    email: "advisor@example.com",
    city: "Noida",
    servicePincodes: ["201301"],
    description: "Project planning support",
    imageUrl: null,
    isPublished: false,
  };
  await page.route("**/api/admin/blogs", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/admin/experts", (route) =>
    route.fulfill({ json: [provider] }),
  );
  await page.route("**/api/admin/experts/expert-1", (route) => {
    provider = { ...provider, ...route.request().postDataJSON() };
    return route.fulfill({ json: provider });
  });
  await page.route("**/api/experts", (route) =>
    route.fulfill({ json: provider.isPublished ? [provider] : [] }),
  );
  await signIntoBusiness(page, "CONTENT_MANAGER");
  await page
    .getByRole("button", { name: "Experts & services", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit provider", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Updated Advisor");
  await page.getByLabel("Phone", { exact: true }).fill("");
  await page.getByLabel("Show on public website").check();
  await page.getByRole("button", { name: "Save provider changes" }).click();
  await expect(
    page.getByText("Updated Advisor", { exact: true }),
  ).toBeVisible();
  expect(provider.phone).toBeNull();
  await page.goto("http://127.0.0.1:4173/experts");
  await expect(
    page.getByRole("heading", { name: "Updated Advisor" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Contact provider" }),
  ).toHaveCount(0);
  await page.getByLabel("Search professionals").fill("not available");
  await expect(
    page.getByText("No providers match these filters."),
  ).toBeVisible();
  await page.getByLabel("Search professionals").fill("Site planning");
  await page.getByLabel("Service PIN code", { exact: true }).fill("201310");
  await expect(
    page.getByText("No providers match these filters."),
  ).toBeVisible();
  await page.getByLabel("Service PIN code", { exact: true }).fill("201301");
  await expect(
    page.getByRole("heading", { name: "Updated Advisor" }),
  ).toBeVisible();
});

test("public articles distinguish an outage from an empty catalogue and support retry", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/api/blogs", (route) =>
    failed
      ? route.fulfill({ status: 503, json: {} })
      : route.fulfill({ json: [] }),
  );
  await page.goto("/blogs");
  await expect(page.getByRole("alert")).toContainText("could not load");
  await expect(page.getByText("New articles are on the way.")).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("New articles are on the way.")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("supplier catalogue edits can disable matching and clear an old price", async ({
  page,
}) => {
  const supplier = {
    id: "supplier-1",
    name: "Supplier One",
    city: "Noida",
    pincode: "201301",
    status: "ACTIVE",
  };
  let product = {
    id: "product-1",
    productName: "CPVC pipe",
    brand: "Astral",
    category: "Pipes",
    unit: "Pieces",
    minimumOrderQty: "10",
    lastQuotedPrice: "200",
    isActive: true,
  };
  await page.route("**/api/suppliers", (route) =>
    route.fulfill({ json: [supplier] }),
  );
  await page.route("**/api/suppliers/supplier-1", (route) =>
    route.fulfill({
      json: {
        ...supplier,
        products: [product],
        ratings: [],
        averageRating: null,
      },
    }),
  );
  await page.route(
    "**/api/suppliers/supplier-1/products/product-1",
    (route) => {
      product = { ...product, ...route.request().postDataJSON() };
      return route.fulfill({ json: product });
    },
  );
  await signIntoBusiness(page, "PROCUREMENT_HEAD");
  await page
    .getByRole("button", { name: "View supplier products & ratings" })
    .click();
  await page.getByRole("button", { name: "Edit supplied product" }).click();
  await page.getByLabel("Last quoted price", { exact: true }).fill("");
  await page.getByLabel("Available for supplier matching").uncheck();
  await page.getByRole("button", { name: "Save supplied product" }).click();
  await expect(page.getByText("Supplier product updated.")).toBeVisible();
  expect(product.isActive).toBe(false);
  expect(product.lastQuotedPrice).toBeNull();
});

test("content staff upload and preview a blog image before saving a draft", async ({
  page,
}) => {
  let blog: Record<string, any> | undefined;
  const imageUrl =
    "http://127.0.0.1:4173/images/products/cpvc-pipe-illustration.png";
  await page.route("**/api/admin/blogs", (route) => {
    if (route.request().method() === "POST")
      blog = route.request().postDataJSON();
    return route.fulfill({
      json:
        route.request().method() === "POST"
          ? { id: "blog-1", ...blog }
          : blog
            ? [{ id: "blog-1", ...blog }]
            : [],
    });
  });
  await page.route("**/api/storage/images", (route) =>
    route.fulfill({ json: { url: imageUrl, key: "images/test.png" } }),
  );
  await signIntoBusiness(page, "CONTENT_MANAGER");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Choosing pipe materials");
  await page.getByLabel("URL slug").fill("choosing-pipes");
  await page
    .getByLabel("Short summary")
    .fill("A guide to comparing pipe materials.");
  await page
    .getByLabel("Article content")
    .fill("Discuss your site requirements with a qualified professional.");
  await page.getByLabel(/Upload featured image url/i).setInputFiles({
    name: "approved.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByLabel("Featured image URL", { exact: true }),
  ).toHaveValue(imageUrl);
  await page.getByRole("button", { name: "Preview article" }).click();
  await expect(
    page.getByText("Draft preview — visible only to staff"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choosing pipe materials" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save article", exact: true }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  expect(blog?.featuredImageUrl).toBe(imageUrl);
  expect(blog?.status).toBe("DRAFT");
  await expect(
    page.getByLabel("Featured image URL", { exact: true }),
  ).toHaveValue("");
});

test("content staff can see where a media-library image is used", async ({
  page,
}) => {
  const imageUrl = "https://cdn.example.test/images/product.webp";
  await page.route("**/api/admin/site-content/draft", (route) =>
    route.fulfill({ json: SITE_CONTENT_DEFAULTS }),
  );
  await page.route("**/api/storage/media?**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "asset-1",
            key: "images/product.webp",
            url: imageUrl,
            originalName: "product.webp",
            mimeType: "image/webp",
            byteSize: 1024,
            createdAt: "2026-10-04T12:00:00.000Z",
            usage: [
              {
                type: "Product",
                label: "Cement",
                location: "Primary image",
              },
              {
                type: "Website content",
                label: "Published website",
                location: "home.heroImage",
              },
            ],
          },
        ],
        page: 1,
        pageSize: 24,
        total: 1,
      },
    }),
  );
  await signIntoBusiness(page, "CONTENT_MANAGER");
  await page.getByRole("button", { name: "Website pages & content" }).click();
  await expect(
    page.getByRole("heading", { name: "Media library" }),
  ).toBeVisible();
  await expect(page.getByText("Used in 2 places")).toBeVisible();
  await expect(page.getByText("Product: Cement · Primary image")).toBeVisible();
  await expect(
    page.getByText("Website content: Published website · home.heroImage"),
  ).toBeVisible();
});

test("procurement compares supplier quotes and reviews PO costs before creation", async ({
  page,
}) => {
  let saved: Record<string, unknown> | undefined;
  const supplier = {
    id: "supplier-1",
    name: "Supplier One",
    phone: "9876543210",
  };
  await page.route("**/api/suppliers", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/procurement", (route) =>
    route.fulfill({
      json: [
        {
          id: "request-1",
          requestNumber: "PR-TEST",
          status: "COMPARING",
          deliveryAddress: "Sector 10 Noida",
          deliveryCity: "Noida",
          deliveryPincode: "201301",
          items: [{ productName: "Cement", quantity: 20, unit: "bag" }],
          purchaseOrders: [],
          supplierQuotes: [
            {
              id: "expired",
              supplier: { ...supplier, name: "Expired Supplier" },
              items: [
                {
                  productName: "Cement",
                  quantity: 20,
                  unit: "bag",
                  unitPrice: 350,
                },
              ],
              totalAmount: "7000",
              leadTimeDays: 1,
              available: true,
              validUntil: "2020-01-01T00:00:00Z",
            },
            {
              id: "current",
              supplier,
              items: [
                {
                  productName: "Cement",
                  quantity: 20,
                  unit: "bag",
                  unitPrice: 400,
                },
              ],
              totalAmount: "8000",
              leadTimeDays: 3,
              available: true,
              validUntil: null,
            },
          ],
        },
      ],
    }),
  );
  await page.route("**/api/purchase-orders", (route) => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { id: "po-test" } });
  });
  await signIntoBusiness(page, "PROCUREMENT_HEAD");
  await page.getByRole("button", { name: "Procurement", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Review purchase order for Expired Supplier",
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Review purchase order for Supplier One" })
    .click();
  await expect(page.getByLabel("Shipping address")).toHaveValue(
    "Sector 10 Noida",
  );
  await page.getByLabel("Shipping contact").fill("Site manager 9876543210");
  await page.getByLabel("PO tax amount (₹)").fill("1440");
  await page.getByLabel("PO freight amount (₹)").fill("300");
  await page
    .getByRole("button", { name: "Create purchase order", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel PO review" }),
  ).toHaveCount(0);
  expect(saved).toMatchObject({
    supplierQuoteId: "current",
    taxAmount: 1440,
    freightAmount: 300,
    shippingContact: "Site manager 9876543210",
  });
});

test("procurement staff save item-level supplier price and availability", async ({
  page,
}) => {
  let saved: Record<string, any> | undefined;
  await page.route("**/api/suppliers", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/procurement", (route) =>
    route.fulfill({
      json: [
        {
          id: "request-1",
          requestNumber: "PR-ALLOC",
          status: "OPEN",
          deliveryAddress: "Sector 10 Noida",
          deliveryCity: "Noida",
          deliveryPincode: "201301",
          items: [
            {
              productName: "Cement",
              brand: "BuildCo",
              category: "cement",
              quantity: 20,
              unit: "bag",
            },
          ],
          purchaseOrders: [],
          supplierQuotes: [],
        },
      ],
    }),
  );
  await page.route("**/api/procurement/request-1/suppliers", (route) =>
    route.fulfill({
      json: {
        candidates: [
          {
            id: "supplier-1",
            name: "Supplier One",
            phone: "9876543210",
            matchedItems: ["Cement"],
            serviceAreaMatch: false,
            cityMatch: true,
            averageScore: 4.5,
          },
        ],
      },
    }),
  );
  await page.route("**/api/procurement/request-1/quotes", (route) => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { id: "quote-1" } });
  });
  await signIntoBusiness(page, "PROCUREMENT_HEAD");
  await page.getByRole("button", { name: "Procurement", exact: true }).click();
  await page.getByRole("button", { name: "Match suppliers" }).click();
  await expect(page.getByText("Same city · Noida")).toBeVisible();
  await page.getByText("Supplier One").click();
  await page.getByLabel("Quantity offered (bag)").fill("12");
  await page.getByLabel("Unit price (₹/bag)").fill("100");
  await page.getByLabel("Lead time (days)").fill("3");
  await page.getByRole("button", { name: "Save supplier quote" }).click();
  await expect
    .poll(() => saved)
    .toMatchObject({
      supplierId: "supplier-1",
      totalAmount: 1200,
      items: [
        { productName: "Cement", quantity: 12, unit: "bag", unitPrice: 100 },
      ],
    });
});

test("procurement revises an approved PO and reviews retained history", async ({
  page,
}) => {
  let po = {
    id: "po-1",
    purchaseOrderNumber: "PO-TEST",
    status: "APPROVED",
    revisionNumber: 1,
    updatedAt: "2026-10-04T10:00:00.000Z",
    shippingAddress: "Sector 10 Noida",
    shippingContact: "Site manager 9876543210",
    subtotal: "8000",
    taxAmount: "1440",
    freightAmount: "300",
    totalAmount: "9740",
    notes: null,
    revisionHistory: [] as any[],
  };
  let saved: any;
  await page.route("**/api/suppliers", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/procurement", (route) =>
    route.fulfill({
      json: [
        {
          id: "pr-1",
          requestNumber: "PR-TEST",
          status: "APPROVAL_PENDING",
          deliveryAddress: "Sector 10 Noida",
          deliveryCity: "Noida",
          deliveryPincode: "201301",
          items: [],
          supplierQuotes: [],
          purchaseOrders: [po],
        },
      ],
    }),
  );
  await page.route("**/api/purchase-orders/po-1/revisions", (route) => {
    saved = route.request().postDataJSON();
    po = {
      ...po,
      status: "DRAFT",
      revisionNumber: 2,
      totalAmount: "9940",
      freightAmount: "500",
      revisionHistory: [
        {
          revisionNumber: 1,
          totalAmount: "9740",
          status: "APPROVED",
          reason: saved.reason,
          revisedAt: "2026-10-04T11:00:00.000Z",
        },
      ],
    };
    return route.fulfill({ json: po });
  });
  await signIntoBusiness(page, "PROCUREMENT_HEAD");
  await page.getByRole("button", { name: "Procurement", exact: true }).click();
  await page.getByRole("button", { name: "Revise PO", exact: true }).click();
  await page.getByLabel("Revised freight (₹)").fill("500");
  await page
    .getByLabel("Revision reason")
    .fill("Supplier confirmed revised freight");
  await page.getByRole("button", { name: "Save PO revision" }).click();
  await expect(
    page.getByRole("button", { name: "Approve PO", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send PO to supplier", exact: true }),
  ).toHaveCount(0);
  await page.getByText("PO revision history", { exact: true }).click();
  await expect(page.getByText(/Revision 1 · APPROVED/)).toBeVisible();
  expect(saved.expectedUpdatedAt).toBe("2026-10-04T10:00:00.000Z");
  expect(saved.freightAmount).toBe(500);
});

test("dispatch staff advance delivery plans through allowed states", async ({
  page,
}) => {
  let plan = {
    id: "plan-1",
    orderId: "order-1",
    order: { orderNumber: "ORD-TEST" },
    status: "PLANNED",
    destination: "Sector 10 Noida",
    vehicleNumber: "UP16TEST",
    driverName: "Test Driver",
    currentLocation: null as string | null,
    estimatedArrival: null,
    notes: null,
  };
  await page.route("**/api/transportation", (route) =>
    route.fulfill({ json: [plan] }),
  );
  await page.route("**/api/transportation/order-1", (route) => {
    plan = { ...plan, ...route.request().postDataJSON() };
    return route.fulfill({ json: plan });
  });
  await signIntoBusiness(page, "DISPATCH_OFFICER");
  await page
    .getByRole("button", { name: "Update delivery status", exact: true })
    .click();
  await expect(
    page
      .getByLabel("Delivery status")
      .getByRole("option", { name: "DELIVERED", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Delivery status").selectOption("SCHEDULED");
  await page.getByLabel("Current location", { exact: true }).fill("Noida yard");
  await page.getByRole("button", { name: "Save delivery update" }).click();
  await expect(
    page.getByText("Current location: Noida yard", { exact: true }),
  ).toBeVisible();
  expect(plan.status).toBe("SCHEDULED");
  await page
    .getByRole("button", { name: "Update delivery status", exact: true })
    .click();
  await expect(
    page
      .getByLabel("Delivery status")
      .getByRole("option", { name: "DISPATCHED", exact: true }),
  ).toHaveCount(1);
  await expect(
    page
      .getByLabel("Delivery status")
      .getByRole("option", { name: "PLANNED", exact: true }),
  ).toHaveCount(0);
});

test("dispatch staff record a partial receipt and see the remaining order quantity", async ({
  page,
}) => {
  let posted: any;
  let plan: any = {
    id: "plan-partial",
    orderId: "order-partial",
    order: {
      orderNumber: "ORD-PARTIAL",
      status: "OUT_FOR_DELIVERY",
      items: [
        {
          id: "line-1",
          productName: "Cement",
          quantityMt: "12",
          unit: "bag",
          deliveries: [],
        },
      ],
    },
    status: "OUT_FOR_DELIVERY",
    destination: "Sector 10 Noida",
    vehicleNumber: "UP16TEST",
    driverName: "Test Driver",
    currentLocation: "Noida",
    estimatedArrival: null,
    notes: null,
  };
  await page.route("**/api/transportation", (route) =>
    route.fulfill({ json: [plan] }),
  );
  await page.route(
    "**/api/transportation/order-partial/deliveries",
    (route) => {
      posted = route.request().postDataJSON();
      plan = {
        ...plan,
        status: "PARTIALLY_DELIVERED",
        order: {
          ...plan.order,
          status: "PARTIALLY_DELIVERED",
          items: [
            {
              ...plan.order.items[0],
              deliveries: [{ quantity: String(posted.items[0].quantity) }],
            },
          ],
        },
      };
      return route.fulfill({ json: { deliveryNumber: "MS-DLV-TEST" } });
    },
  );
  await signIntoBusiness(page, "DISPATCH_OFFICER");
  await page
    .getByRole("button", { name: "Transportation", exact: true })
    .click();
  await expect(
    page.getByText("Cement: 0 / 12 bag delivered", { exact: true }),
  ).toBeVisible();
  const quantity = page.locator('input[name="quantity-line-1"]');
  await expect(quantity).toHaveAttribute("max", "12");
  await quantity.fill("5.5");
  await page.getByRole("button", { name: "Save delivered quantities" }).click();
  await expect(
    page.getByText("Cement: 5.5 / 12 bag delivered", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[name="quantity-line-1"]')).toHaveAttribute(
    "max",
    "6.5",
  );
  expect(posted).toMatchObject({
    items: [{ orderItemId: "line-1", quantity: 5.5 }],
  });
});

test("admin keeps navigation available when a feature download fails", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("ms-staff-token", "feature-load-test"),
  );
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
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
  await page.route("**/features/catalogue/CatalogueManager.tsx*", (route) =>
    route.abort("failed"),
  );
  await page.goto("http://127.0.0.1:4174");
  await page.getByRole("button", { name: "Products, prices & offers" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "This screen could not load",
  );
  await expect(
    page.getByRole("button", { name: "Reload workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByText("This screen could not load")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Products, prices & offers" }),
  ).toBeVisible();
});

test("owner reviews audit records and applies entity filters", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("ms-staff-token", "feature-load-test"),
  );
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
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
  let requestedEntity = "";
  let requestedFrom = "";
  await page.route("**/api/admin/audit?**", (route) => {
    requestedEntity =
      new URL(route.request().url()).searchParams.get("entityId") || "";
    requestedFrom =
      new URL(route.request().url()).searchParams.get("from") || "";
    return route.fulfill({
      json: {
        items: [
          {
            id: "a1",
            action: "QUOTATION_PUBLISHED",
            entityType: "QUOTATION",
            entityId: "q1",
            createdAt: "2026-10-04T10:00:00Z",
            metadata: { revision: 2 },
            staff: { name: "Owner", role: "SUPER_ADMIN" },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      },
    });
  });
  await page.goto("http://127.0.0.1:4174");
  await page.getByRole("button", { name: "Audit log", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "QUOTATION_PUBLISHED", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Entity reference").fill("q1");
  await page.getByLabel("From date (IST)").fill("2026-10-04");
  await page.getByLabel("Through date (IST)").fill("2026-10-04");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect.poll(() => requestedEntity).toBe("q1");
  await expect.poll(() => requestedFrom).toBe("2026-10-04");
  await page.getByText("View details", { exact: true }).click();
  await expect(page.locator("pre")).toContainText('"revision": 2');
  await expect(
    page.getByRole("button", { name: "Next audit page" }),
  ).toBeDisabled();
});

test("staff can search seven-day activity and return to its related workspace", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("ms-staff-token", "feature-load-test"));
  await page.route("**/api/auth/mode", (route) => route.fulfill({ json: { demo: true } }));
  await page.route("**/api/auth/staff/me", (route) => route.fulfill({ json: { name: "Owner", role: "SUPER_ADMIN", isDemo: true } }));
  await page.route("**/api/workspace/overview", (route) => route.fulfill({ json: { customers: 0, newCustomers30Days: 0, openFollowups: 0, closedFollowups: 0, demo: true } }));
  await page.route("**/api/analytics/overview**", (route) => route.fulfill({ json: { days: 30, totals: { pageViews: 0, productViews: 0, addToList: 0, requestHandoffs: 0 }, daily: [], topPages: [], topProducts: [], privacy: "Aggregate counts only." } }));
  await page.route("**/api/admin/audit/recent", (route) => route.fulfill({ json: {
    since: "2026-09-29T00:00:00.000Z",
    categories: ["Storefront", "Sales", "Procurement", "Settings & team"],
    total: 2,
    limit: 50,
    items: [
      { id: "recent-upload", action: "MEDIA_ASSET_UPLOADED", entityType: "MEDIA_ASSET", entityId: "media-one", createdAt: "2026-10-06T08:30:00.000Z", title: "site-banner.webp", category: "Storefront", entityLabel: "Storefront image", actionLabel: "Uploaded", changedFields: ["mimeType", "byteSize"], staff: { name: "Owner", role: "SUPER_ADMIN" } },
      { id: "recent-product", action: "CATALOG_PRODUCT_UPDATED", entityType: "CATALOG_PRODUCT", entityId: "product-one", createdAt: "2026-10-05T08:30:00.000Z", title: "QA test product", category: "Storefront", entityLabel: "Catalogue product", actionLabel: "Edited", changedFields: ["price", "availability"], staff: { name: "Catalogue Staff", role: "CATALOG_MANAGER" } },
    ],
  } }));
  await page.goto("http://127.0.0.1:4174");
  await page.getByRole("button", { name: "Recent activity", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();
  await expect(page.getByText("site-banner.webp")).toBeVisible();
  await expect(page.getByText("Changed: mimeType, byteSize")).toBeVisible();
  await expect(page.getByText("Kept here for 7 days")).toBeVisible();
  await page.getByLabel("Search recent changes").fill("Catalogue Staff");
  await expect(page.getByText("QA test product")).toBeVisible();
  await expect(page.getByText("site-banner.webp")).toHaveCount(0);
  await page.getByRole("button", { name: "Open related workspace" }).click();
  await expect(page.getByRole("heading", { name: "Website Catalogue" })).toBeVisible();
});

test("sales staff schedule and cancel a quotation reminder", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("ms-staff-token", "feature-load-test"),
  );
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Owner", role: "SALES_MANAGER", isDemo: true },
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
  let reminder: {
    id: string;
    channel: string;
    scheduledAt: string;
    status: string;
  } | null = null;
  await page.route("**/api/quotes", (route) =>
    route.fulfill({
      json: [
        {
          id: "q1",
          quoteNumber: "MS-QT-TEST",
          customerName: "Test Customer",
          status: "QUOTE_SENT",
          totalAmount: "1000",
          followups: reminder ? [reminder] : [],
        },
      ],
    }),
  );
  await page.route("**/api/quotes/q1/followups", (route) => {
    const body = route.request().postDataJSON();
    reminder = {
      id: "f1",
      channel: body.channel,
      scheduledAt: body.scheduledAt,
      status: "SCHEDULED",
    };
    return route.fulfill({ json: reminder });
  });
  await page.route("**/api/quotes/q1/followups/f1", (route) => {
    reminder!.status = route.request().postDataJSON().status;
    return route.fulfill({ json: reminder });
  });
  await page.goto("http://127.0.0.1:4174");
  await page
    .getByRole("button", { name: "Business management", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Quote follow-ups", exact: true })
    .click();
  await page.getByLabel("Reminder channel").selectOption("INTERNAL");
  await page.getByLabel("Reminder time").fill("2030-01-01T10:00");
  await page.getByLabel("Reminder notes").fill("Discuss revised quantities");
  await page
    .getByRole("button", { name: "Schedule follow-up", exact: true })
    .click();
  await expect(page.getByText(/INTERNAL.*SCHEDULED/)).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText(/INTERNAL.*CANCELLED/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toHaveCount(0);
});

test("catalogue staff activate and deactivate discount rules", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("ms-staff-token", "feature-load-test"),
  );
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Owner", role: "CATALOG_MANAGER", isDemo: true },
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
  let active = false;
  let created: Record<string, unknown> | undefined;
  let edited: Record<string, unknown> | undefined;
  await page.route("**/api/discount-rules", (route) => {
    if (route.request().method() === "POST") {
      created = route.request().postDataJSON();
      return route.fulfill({ json: { id: "new-rule", ...created } });
    }
    return route.fulfill({
      json: [
        {
          id: "rule1",
          updatedAt: "2026-10-04T10:00:00.000Z",
          name: "Pipe offer",
          percentageOff: "5",
          fixedAmountOff: "0",
          category: "pipes",
          deliveryPincodes: ["201301"],
          isActive: active,
        },
      ],
    });
  });
  await page.route("**/api/discount-rules/rule1", (route) => {
    edited = route.request().postDataJSON();
    active = Boolean(edited?.isActive);
    return route.fulfill({ json: { id: "rule1", isActive: active } });
  });
  await page.goto("http://127.0.0.1:4174");
  await page
    .getByRole("button", { name: "Business management", exact: true })
    .click();
  await page.getByLabel("Rule name", { exact: true }).fill("Scheduled offer");
  await page.getByLabel("Minimum quantity", { exact: true }).fill("10");
  await page.getByLabel("Maximum quantity", { exact: true }).fill("20");
  await page.getByLabel("Starts at (optional)").fill("2030-01-01T10:00");
  await page.getByLabel("Ends at (optional)").fill("2030-01-02T10:00");
  await page
    .getByRole("button", { name: "Save discount rule", exact: true })
    .click();
  await expect.poll(() => created?.maximumQuantity).toBe(20);
  expect(created?.minimumQuantity).toBe(10);
  expect(
    new Date(String(created?.endsAt)).getTime() -
      new Date(String(created?.startsAt)).getTime(),
  ).toBe(86400000);
  await page
    .getByRole("button", { name: "Activate Pipe offer", exact: true })
    .click();
  await expect(
    page.getByText("Active for new quotations", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Deactivate Pipe offer", exact: true })
    .click();
  await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
  expect(active).toBe(false);
  await page
    .getByRole("button", { name: "Edit Pipe offer", exact: true })
    .click();
  await expect(page.getByLabel("Rule name", { exact: true })).toHaveValue(
    "Pipe offer",
  );
  await page.getByLabel("Category (optional)").fill("");
  await page
    .getByRole("button", { name: "Save discount rule", exact: true })
    .click();
  await expect.poll(() => edited?.category).toBe(null);
  expect(edited?.minimumQuantity).toBe(null);
  expect(edited?.startsAt).toBe(null);
  expect(edited?.expectedUpdatedAt).toBe("2026-10-04T10:00:00.000Z");
  expect(edited?.description).toBe(null);
});

test("owner reviews skipped notification jobs", async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("ms-staff-token", "feature-load-test"),
  );
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
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
  let requestedOutcome = "";
  await page.route("**/api/admin/notifications?**", (route) => {
    requestedOutcome =
      new URL(route.request().url()).searchParams.get("status") || "";
    return route.fulfill({
      json: {
        items: [
          {
            id: "notice1",
            type: "quote-expiry-reminder",
            runAt: "2026-10-04T10:00:00Z",
            status: "SKIPPED",
            skipReason: "Quotation no longer awaiting a response",
          },
        ],
        total: 1,
        pageSize: 25,
      },
    });
  });
  await page.goto("http://127.0.0.1:4174");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "SKIPPED", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: "Quotation no longer awaiting a response",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next notification page" }),
  ).toBeDisabled();
  await page.getByLabel("Notification outcome").selectOption("SKIPPED");
  await page.getByRole("button", { name: "Filter notifications" }).click();
  await expect.poll(() => requestedOutcome).toBe("SKIPPED");
});

test("sales staff review pack prices with read-only catalogue access", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("ms-staff-token", "feature-load-test"),
  );
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Owner", role: "SALES_MANAGER", isDemo: true },
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
  await page.route("**/api/products/catalogue", (route) =>
    route.fulfill({
      json: [
        {
          id: "read1",
          name: "CPVC family",
          brand: "Astral",
          categoryLabel: "Pipes",
          unit: "family",
          isPublished: true,
          price: null,
          variants: [
            {
              id: "pack1",
              label: "25 mm × 3 m",
              unit: "length",
              price: "320",
              inStock: true,
              minOrderQuantity: "10",
              quantityBreaks: [{ minimumQuantity: 20, unitPrice: 300 }],
            },
          ],
        },
      ],
    }),
  );
  await page.goto("http://127.0.0.1:4174");
  await page
    .getByRole("button", { name: "Products, prices & offers", exact: true })
    .click();
  await expect(page.getByText(/Read-only catalogue access/)).toBeVisible();
  await page
    .getByText("View pack prices and availability", { exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "25 mm × 3 m", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /₹320 \/ length/ }),
  ).toBeVisible();
  await expect(
    page.getByText("20+ length: ₹300 each", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add product", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Unpublish", exact: true }),
  ).toHaveCount(0);
});

test("procurement staff inspect order materials without dispatch actions", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("ms-staff-token", "feature-load-test"),
  );
  await page.route("**/api/auth/mode", (route) =>
    route.fulfill({ json: { demo: true } }),
  );
  await page.route("**/api/auth/staff/me", (route) =>
    route.fulfill({
      json: { name: "Owner", role: "PROCUREMENT_HEAD", isDemo: true },
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
  await page.route("**/api/analytics/dashboard", (route) =>
    route.fulfill({
      json: {
        currentMonthOrderValueInr: 0,
        activeRfqsCount: 0,
        dailyOrderValue: [],
      },
    }),
  );
  await page.route("**/api/orders", (route) =>
    route.fulfill({
      json: [
        {
          id: "ord1",
          orderNumber: "MS-ORD-TEST",
          customerName: "Test Customer",
          status: "IN_TRANSIT",
          deliverySite: "Noida site",
          pincode: "201301",
          grandTotal: "6400",
          dispatch: { truckNumber: "UP16-TEST", currentStep: 4 },
          items: [
            {
              id: "line1",
              productName: "CPVC Pipe",
              brandName: "Astral",
              specification: "25 mm",
              quantityMt: "20",
              unit: "length",
              unitPrice: "320",
              lineTotal: "6400",
            },
          ],
        },
      ],
    }),
  );
  await page.goto("http://127.0.0.1:4174");
  await page
    .getByRole("button", { name: "Quotations & orders", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Orders & dispatch", exact: true })
    .click();
  await expect(page.getByText(/Read-only order access/)).toBeVisible();
  await page
    .getByText("View order materials and delivery details", { exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "20 length", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Delivery: Noida site · 201301", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Advance dispatch", exact: true }),
  ).toHaveCount(0);
});

test("accounts staff record and approve commission entries", async ({
  page,
}) => {
  let rows: Record<string, unknown>[] = [];
  let created: Record<string, unknown> | undefined;
  await page.route("**/api/commissions**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname.endsWith("/approve")) {
      rows = rows.map((row) => ({ ...row, status: "APPROVED" }));
      return route.fulfill({ json: rows[0] });
    }
    if (request.method() === "POST") {
      created = request.postDataJSON();
      rows = [
        {
          id: "commission-1",
          ...created,
          amount: 25,
          status: "PENDING_REVIEW",
        },
      ];
      return route.fulfill({ status: 201, json: rows[0] });
    }
    return route.fulfill({ json: rows });
  });
  await signIntoBusiness(page, "ACCOUNTS_MANAGER");
  await expect(
    page.getByRole("heading", { name: "Record a commission" }),
  ).toBeVisible();
  await page
    .getByLabel("Beneficiary name", { exact: true })
    .fill("Site liaison");
  await page.getByLabel("Basis amount (₹)", { exact: true }).fill("1000");
  await page.getByLabel("Rate (%)", { exact: true }).fill("2.5");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(
    page.getByText("Site liaison · ₹25", { exact: true }),
  ).toBeVisible();
  expect(created).toMatchObject({
    beneficiaryName: "Site liaison",
    basisAmount: 1000,
    ratePct: 2.5,
  });
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("APPROVED", { exact: true })).toBeVisible();
});

test("accounts staff configure customer loyalty rules", async ({ page }) => {
  let saved: Record<string, unknown> | undefined;
  const initial = {
    enabled: false,
    pointsPer100Inr: 1,
    minimumOrderValueInr: 1000,
    redemptionValuePerPoint: 0.1,
    minimumRedemptionPoints: 100,
    expiryAfterDays: 365,
  };
  await page.route("**/api/admin/loyalty/settings", async (route) => {
    if (route.request().method() === "PUT")
      saved = route.request().postDataJSON();
    return route.fulfill({ json: saved || initial });
  });
  await signIntoBusiness(page, "ACCOUNTS_MANAGER");
  await page
    .getByRole("button", { name: "Loyalty program", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Customer rewards settings" }),
  ).toBeVisible();
  await page.getByLabel("Points earned per ₹100", { exact: true }).fill("2");
  await page
    .getByLabel("Minimum qualifying order (₹)", { exact: true })
    .fill("1500");
  await page.getByLabel("Enable rewards", { exact: true }).check();
  await page.getByRole("button", { name: "Save program settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  expect(saved).toMatchObject({
    enabled: true,
    pointsPer100Inr: 2,
    minimumOrderValueInr: 1500,
    redemptionValuePerPoint: 0.1,
    minimumRedemptionPoints: 100,
    expiryAfterDays: 365,
  });
});
