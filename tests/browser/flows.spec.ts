import { test, expect } from "@playwright/test";

const customer = {
  id: "customer-1",
  name: "Test Customer",
  phone: "9876543210",
  email: "test@example.com",
  companyName: "Test Builders",
  shippingAddress: "Plot 42, Sector 10",
  city: "Noida",
  pincode: "201301",
  materialList: [],
  listVersion: 0,
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
  await page.addInitScript(() => {
    window.initSendOTP = () => {};
    window.sendOtp = (_identifier, success) =>
      success?.({ reqId: "test-request-id" });
    window.retryOtp = (_channel, success) =>
      success?.({ reqId: "test-request-id" });
    window.verifyOtp = (_otp, success) =>
      success?.({ "access-token": "mock.jwt.access-token" });
  });
  await page.route("https://verify.msg91.com/otp-provider.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );
  // Avoid coupling offline browser tests to whichever local API happens to be running.
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 503, json: { message: "Offline test fixture" } }),
  );
  await page.route("**/api/products", (route) => route.fulfill({ status: 503, json: { message: "Offline test fixture" } }));
  await page.route("**/api/customer/me", (route) =>
    route.fulfill({ status: 401, json: { message: "Please sign in" } }),
  );
});
test("request prepares complete WhatsApp and email messages without claiming delivery", async ({
  page,
}) => {
  await page.route("**/api/customer/me", (route) =>
    route.fulfill({ json: customer }),
  );
  await page.route("**/api/customer/materials", (route) =>
    route.fulfill({
      json: { version: route.request().postDataJSON().version + 1 },
    }),
  );
  await page.goto("/get-quote");
  await page
    .getByPlaceholder("Material name", { exact: true })
    .fill("CPVC pipe");
  await page.getByRole("button", { name: "Add custom material" }).click();
  await page.getByLabel("Quantity for CPVC pipe").fill("20");
  await page
    .getByPlaceholder("Enter the required size or ask staff to confirm")
    .fill("3/4 inch");
  await page.getByRole("button", { name: "Preview request" }).click();
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
    "CPVC pipe",
    "20 Pieces",
    "3/4 inch",
  ])
    expect(message).toContain(value);
  await expect(page.getByText("Quotation Request Received!")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Submit quotation request" })).toHaveCount(0);
  await page.getByLabel("Preferred contact channel").selectOption("email");
  await page.getByRole("button", { name: "Preview request" }).click();
  const email = page.getByRole("link", { name: "Continue in email" });
  expect(decodeURIComponent((await email.getAttribute("href"))!)).toContain(
    "body=Material Square",
  );
  await page.getByLabel("PIN code").fill("123");
  await page.getByRole("button", { name: "Preview request" }).click();
  await expect(email).not.toBeVisible();
});
test("public browsing stays open; cart and quote actions require OTP and preserve the selection", async ({
  page,
}) => {
  let signedIn = false;
  let saved: unknown[] = [];
  let version = 0;
  await page.route("**/api/customer/me", (route) =>
    route.fulfill(
      signedIn
        ? { json: { ...customer, materialList: saved, listVersion: version } }
        : { status: 401, json: { message: "Please sign in" } },
    ),
  );
  await page.route("**/api/auth/customer/otp/verify-msg91", (route) => {
    signedIn = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/customer/materials", (route) => {
    saved = route.request().postDataJSON().items;
    return route.fulfill({ json: { version: ++version } });
  });
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: [{ ...publishedPipe, specs: {} }] }),
  );
  await page.goto("/marketplace");
  await expect(
    page.getByText("Loading your saved material list…"),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Add to List", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/account\?next=\/get-quote$/);
  await expect(
    page.getByRole("heading", { name: "Sign in with your mobile" }),
  ).toBeVisible();
  await page.getByLabel("Mobile number", { exact: true }).fill("9876543210");
  await page.getByRole("button", { name: "Send OTP", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    "A six-digit verification code has been sent to your mobile number.",
  );
  await page.getByLabel("Six-digit OTP").fill("654321");
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page).toHaveURL(/\/get-quote$/);
  await expect(page.locator(".material-editor")).toHaveCount(1);
  await expect.poll(() => saved.length).toBe(1);
});

test("homepage search suggestions reflect the live catalogue and staff-set price", async ({ page }) => {
  const liveProduct = {
    id: "live-manager-product", code: "MS-LIVE-01", name: "Live Manager Pipe",
    brand: "Manager Brand", category: "pipes", categoryLabel: "Pipes & Fittings",
    unit: "3 m length", image: "/images/products/cpvc-pipe-illustration.png", inStock: true,
    price: "456.00", features: [], applications: [], specs: {},
  };
  const events: Record<string, unknown>[] = [];
  await page.route("**/api/analytics/events", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ json: { recorded: true } });
  });
  await page.route("**/api/products", (route) => route.fulfill({ json: [liveProduct] }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Materials for Every Project Stage" })).toBeVisible();
  await expect(page.getByText("Elite Buildcon Projects", { exact: true })).not.toBeVisible();
  await page.locator(".search-input").fill("Live Manager Pipe");
  await expect(page.getByText("Matching Products")).toBeVisible();
  await expect(page.getByText("₹456", { exact: true })).toBeVisible();
  await expect(page.getByText("Live Manager Pipe", { exact: true })).toBeVisible();
  await expect.poll(() => events.length).toBeGreaterThan(0);
  expect(events).toContainEqual({ type: "page_view", target: "home" });
  expect(JSON.stringify(events)).not.toContain("Live Manager Pipe");
});

test("product detail lets customers search and select pack variants with their own price and images", async ({ page }) => {
  const paint = {
    id: "paint-family", code: "MS-PNT-TEST", name: "Interior Emulsion", brand: "Example Paints",
    category: "paints", categoryLabel: "Paints & Wall Prep", unit: "pack", image: "/images/products/paint-bucket-illustration.png",
    galleryImages: ["/images/products/paint-bucket-illustration.png", "/images/categories/paints-category.jpg"],
    inStock: false, features: [], applications: [], specs: {}, variants: [
      { id: "paint-1l", label: "1 L · Base White", attributes: { volume: "1 L", shade: "Base White" }, unit: "1 L tin", price: "187.00", compareAtPrice: "258.00", priceNote: "Indicative; confirm", inStock: false, sortOrder: 0 },
      { id: "paint-4l", label: "4 L · Base White", attributes: { volume: "4 L", shade: "Base White" }, unit: "4 L tin", price: "724.00", compareAtPrice: "953.00", priceNote: "Indicative; confirm", inStock: false, sortOrder: 1 },
    ],
  };
  await page.route("**/api/products", (route) => route.fulfill({ json: [paint] }));
  await page.goto("/marketplace");
  await page.getByRole("button", { name: "Specs" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".rate-big")).toContainText("₹187");
  await dialog.getByLabel("Choose size, pack or colour").selectOption("paint-4l");
  await expect(dialog.locator(".rate-big")).toContainText("₹724");
  await expect(dialog.locator(".selected-size-badge")).toContainText("4 L");
  await dialog.getByRole("button", { name: "View product image 2" }).click();
  await expect(dialog.locator(".modal-img-container img")).toHaveAttribute("src", "/images/categories/paints-category.jpg");
});

test("admin overview displays aggregate website activity and top products", async ({ page }) => {
  await page.route("**/api/auth/mode", (route) => route.fulfill({ json: { demo: true } }));
  await page.route("**/api/auth/staff/login", (route) => route.fulfill({ json: { accessToken: "analytics-test-token" } }));
  await page.route("**/api/auth/staff/me", (route) => route.fulfill({ json: { name: "Owner", role: "SUPER_ADMIN", isDemo: true } }));
  await page.route("**/api/workspace/overview", (route) => route.fulfill({ json: { customers: 3, newCustomers30Days: 2, activeCustomers30Days: 2, openFollowups: 1, closedFollowups: 0, demo: true } }));
  await page.route("**/api/analytics/overview**", (route) => route.fulfill({ json: {
    days: 30,
    totals: { pageViews: 87, productViews: 24, addToList: 8, requestHandoffs: 5 },
    daily: [{ date: "2026-10-03", pageViews: 87, productViews: 24, addToList: 8, requestHandoffs: 5 }],
    topPages: [{ page: "marketplace", views: 40 }],
    topProducts: [{ id: "pipe-1", name: "Astral CPVC Pipe", views: 12 }],
    privacy: "Aggregate event counts only; no visitor IDs, search terms, addresses, or contact details are stored.",
  } }));
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await expect(page.getByRole("heading", { name: "Website activity · last 30 days" })).toBeVisible();
  await expect(page.getByText("87", { exact: true })).toBeVisible();
  await expect(page.getByText("Astral CPVC Pipe", { exact: true })).toBeVisible();
  await expect(page.getByText(/no visitor IDs/)).toBeVisible();
});
test("OTP sign-in restores account and logout clears browser view", async ({
  page,
}) => {
  let signedIn = false;
  await page.route("**/api/customer/me", (route) =>
    route.fulfill(signedIn ? { json: customer } : { status: 401, json: {} }),
  );
  await page.route("**/api/auth/customer/otp/verify-msg91", (route) => {
    signedIn = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/customer/logout", (route) => {
    signedIn = false;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto("/account");
  await page.getByLabel("Mobile number", { exact: true }).fill("9876543210");
  await page.getByRole("button", { name: "Send OTP", exact: true }).click();
  await page.getByLabel("Six-digit OTP").fill("654321");
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page).toHaveURL(/\/marketplace$/);
  await page.goto("/account");
  await expect(page.getByLabel("Full name")).toHaveValue("Test Customer");
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Test Customer");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in with your mobile" }),
  ).toBeVisible();
});
test("failed list saves are visible instead of claiming persistence", async ({
  page,
}) => {
  await page.route("**/api/customer/me", (route) =>
    route.fulfill({ json: customer }),
  );
  await page.route("**/api/customer/materials", (route) =>
    route.fulfill({
      status: 409,
      json: { message: "Your material list changed on another device." },
    }),
  );
  await page.goto("/get-quote");
  await page.getByPlaceholder("Material name", { exact: true }).fill("Cement");
  await page.getByRole("button", { name: "Add custom material" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your changes couldn't be saved",
  );
});

test("admin requires sign-in and displays login failures", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174");
  await expect(
    page.getByRole("button", { name: "Sign In to Workspace", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Mobile number or email", { exact: true }).fill("9000000000");
  await page.getByLabel("Password").fill("wrong-password");
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Invalid staff credentials" }),
    }),
  );
  await page.getByRole("button", { name: "Sign In to Workspace", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid staff credentials");
  await expect(page.getByRole("navigation")).not.toBeVisible();
});

test("admin edits customer-facing catalogue price and offer details", async ({ page }) => {
  const original = {
    id: "listing-1", slug: "starter-cpvc", code: "MS-PIP-01", name: "Starter CPVC Pipe",
    brand: "Astral", brandTagline: "CPVC Pro", category: "pipes", categoryLabel: "Pipes & Fittings",
    unit: "3 m length", packaging: "Single length", image: "/images/products/cpvc-pipe-illustration.png",
    grade: "CPVC", description: "Product description", minOrderQty: "1 length", dispatchTime: "Confirm",
    price: "300", compareAtPrice: "350", priceNote: "per length, GST extra", offerLabel: "Offer",
    offerStartsAt: null, offerEndsAt: null,
    isInStock: true, isPublished: true, features: ["Feature"], applications: ["Application"],
    specifications: { size: "25 mm" }, sortOrder: 0,
  };
  let saved: Record<string, unknown> = original;
  let updatedBody: Record<string, unknown> | undefined;
  let uploadedAuthorization = "";
  await page.route("**/api/auth/mode", (route) => route.fulfill({ json: { demo: true } }));
  await page.route("**/api/auth/staff/login", (route) => route.fulfill({ json: { accessToken: "test-staff-token" } }));
  await page.route("**/api/auth/staff/me", (route) => route.fulfill({ json: { name: "Catalog Manager", role: "CATALOG_MANAGER", isDemo: true } }));
  await page.route("**/api/workspace/overview", (route) => route.fulfill({ json: { customers: 1, newCustomers30Days: 1, activeCustomers30Days: 1, openFollowups: 0, closedFollowups: 0, demo: true } }));
  await page.route("**/api/analytics/overview**", (route) => route.fulfill({ json: { days: 30, totals: { pageViews: 0, productViews: 0, addToList: 0, requestHandoffs: 0 }, daily: [], topPages: [], topProducts: [], privacy: "Aggregate counts only." } }));
  await page.route("**/api/products/catalogue", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: [saved] });
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
  await page.route("**/api/storage/images", (route) => {
    uploadedAuthorization = route.request().headers().authorization || "";
    return route.fulfill({ json: { key: "images/test.png", url: "https://assets.example.test/images/test.png" } });
  });
  await page.goto("http://127.0.0.1:4174");
  await page.getByLabel("Mobile number or email").fill("owner@example.com");
  await page.getByLabel("Password").fill("long-test-password");
  await page.getByRole("button", { name: "Sign In to Workspace" }).click();
  await page.getByRole("button", { name: "Products, prices & offers" }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Price (₹ per unit)").fill("320");
  await page.getByLabel("Original price (₹)").fill("400");
  await page.getByLabel("Price note").fill("per length, GST extra");
  await page.getByLabel("Offer label").fill("October offer");
  await page.getByLabel("Offer starts").fill("2026-10-05");
  await page.getByLabel("Offer ends").fill("2026-10-31");
  await page.locator('.catalogue-image-upload').filter({ hasText: "Upload product image" }).locator('input[type="file"]').setInputFiles({ name: "product.png", mimeType: "image/png", buffer: Buffer.from("test image") });
  await expect(page.getByLabel("Product image path or HTTPS URL")).toHaveValue("https://assets.example.test/images/test.png");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("status")).toContainText("Product saved and published");
  expect(updatedBody).toMatchObject({ price: 320, compareAtPrice: 400, offerLabel: "October offer", offerStartsAt: "2026-10-05", offerEndsAt: "2026-10-31", image: "https://assets.example.test/images/test.png" });
  expect(uploadedAuthorization).toBe("Bearer test-staff-token");
});

test("owner creates staff accounts, assigns roles, disables access, and resets passwords", async ({ page }) => {
  const owner = { id: "owner-1", name: "Material Square Owner", phone: "9876543210", email: "owner@example.com", role: "SUPER_ADMIN", isActive: true, isDemo: true, createdAt: "2026-10-01T00:00:00.000Z" };
  const roles = [
    { role: "CATALOG_MANAGER", label: "Catalogue & pricing manager", description: "Manages products", permissions: ["catalog.manage"] },
    { role: "SALES_MANAGER", label: "Sales & customer support", description: "Manages follow-ups", permissions: ["customers.read"] },
  ];
  let staffRows = [owner];
  let createdPayload: Record<string, unknown> | undefined;
  let roleUpdate: Record<string, unknown> | undefined;
  let disabledUpdate: Record<string, unknown> | undefined;
  let resetPayload: Record<string, unknown> | undefined;

  await page.route("**/api/auth/mode", (route) => route.fulfill({ json: { demo: true } }));
  await page.route("**/api/auth/staff/login", (route) => route.fulfill({ json: { accessToken: "owner-token" } }));
  await page.route("**/api/auth/staff/me", (route) => route.fulfill({ json: owner }));
  await page.route("**/api/workspace/overview", (route) => route.fulfill({ json: { customers: 0, newCustomers30Days: 0, activeCustomers30Days: 0, openFollowups: 0, closedFollowups: 0, demo: true } }));
  await page.route("**/api/analytics/overview**", (route) => route.fulfill({ json: { days: 30, totals: { pageViews: 0, productViews: 0, addToList: 0, requestHandoffs: 0 }, daily: [], topPages: [], topProducts: [], privacy: "Aggregate counts only." } }));
  await page.route("**/api/admin/staff/roles", (route) => route.fulfill({ json: roles }));
  await page.route("**/api/admin/staff", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: staffRows });
    createdPayload = route.request().postDataJSON();
    const created = { id: "staff-2", name: String(createdPayload.name), phone: String(createdPayload.phone), email: String(createdPayload.email), role: String(createdPayload.role), isActive: true, isDemo: true, createdAt: "2026-10-03T00:00:00.000Z" };
    staffRows = [...staffRows, created];
    return route.fulfill({ status: 201, json: created });
  });
  await page.route("**/api/admin/staff/staff-2", (route) => {
    const update = route.request().postDataJSON();
    if (typeof update.isActive === "boolean") disabledUpdate = update;
    else roleUpdate = update;
    staffRows = staffRows.map((staff) => staff.id === "staff-2" ? { ...staff, ...update } : staff);
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
  await expect(page.getByRole("heading", { name: "Staff & roles" })).toBeVisible();
  await expect(page.getByText("Owner / Main client")).toBeVisible();
  await page.getByLabel("Full name").fill("Asha Manager");
  await page.getByLabel("Mobile number (optional)").fill("9876543211");
  await page.getByLabel("Email address (optional)").fill("asha@example.com");
  await page.getByRole("combobox", { name: "Role", exact: true }).selectOption("CATALOG_MANAGER");
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
  await page.getByLabel("New password for Asha Manager").fill("replacement-staff-password");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Password reset");
  expect(createdPayload).toMatchObject({ name: "Asha Manager", phone: "9876543211", email: "asha@example.com", role: "CATALOG_MANAGER" });
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

test("marketplace displays published API product prices and offer labels", async ({ page }) => {
  await page.route("**/api/products", (route) => route.fulfill({ json: [{
    id: "listed-product", code: "MS-TEST-1", name: "API Listed CPVC Pipe", brand: "Astral",
    category: "pipes", categoryLabel: "Pipes & Fittings", unit: "3 m length",
    image: "/images/products/cpvc-pipe-illustration.png", grade: "CPVC", features: [],
    applications: [], minOrderQty: "1 length", inStock: true, specs: {}, price: "320.00",
    compareAtPrice: "400.00", priceNote: "per length, GST extra", offerLabel: "Launch offer",
  }] }));
  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: "API Listed CPVC Pipe" })).toBeVisible();
  await expect(page.locator(".rate-amount")).toHaveText("₹320");
  await expect(page.locator(".catalogue-list-price")).toContainText("₹400");
  await expect(page.locator(".catalogue-list-price")).toContainText("Launch offer");
  await expect(page.locator(".catalogue-price-caveat")).toHaveText("per length, GST extra");
});

test('account and request screens fit mobile and provide clear previews', async ({page}, testInfo)=>{
 let legacyActivityCalls=0;
 await page.route('**/api/customer/me', route=>route.fulfill({json:{...customer,materialList:[{id:'cpvc',name:'CPVC pipe',brand:'Preferred brand',unit:'Pieces',quantity:20,specification:'3/4 inch'}]}}));
 await page.route('**/api/customer/activity', route=>{legacyActivityCalls++; return route.fulfill({json:{requests:[],quotations:[],orders:[],loyalty:null}});});
 await page.goto('/get-quote');
 await page.getByRole('button',{name:'Preview request'}).click();
 await page.screenshot({path:testInfo.outputPath('material-square-request-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('material-square-request-mobile.png'),fullPage:true});
 await page.goto('/account');
  await expect(page.getByLabel('Full name')).toHaveValue('Test Customer');
  await expect(page.getByRole('heading',{name:'Requests, quotations & orders'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Material Square points'})).toHaveCount(0);
  expect(legacyActivityCalls).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('material-square-account-mobile.png'),fullPage:true});
});

test('different pipe sizes remain separate after refresh and in request messages', async ({page}, testInfo) => {
  let saved: unknown[] = [];
  let version = 0;
  await page.route('**/api/customer/me', route => route.fulfill({json:{...customer, materialList:saved, listVersion:version}}));
  await page.route('**/api/customer/materials', route => {
    const data = route.request().postDataJSON();
    saved = data.items;
    return route.fulfill({json:{version:++version}});
  });
  await page.route('**/api/products', route => route.fulfill({json:[publishedPipe]}));
  await page.goto('/marketplace');
  const card = page.locator('.catalog-product-card').filter({hasText:'CPVC Pro'}).first();
  await card.getByRole('button', {name:'Choose size'}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Required size / specification').fill('3/4 inch');
  await dialog.getByLabel('Quantity (').fill('20');
  await dialog.getByRole('button', {name:'Add this selection to Material List'}).click();
  await dialog.getByLabel('Required size / specification').fill('1 inch');
  await dialog.getByLabel('Quantity (').fill('10');
  await dialog.getByRole('button', {name:'Add this selection to Material List'}).click();
  await expect.poll(()=>saved.length).toBe(2);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('material-square-product-mobile.png')});
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await dialog.getByRole('button',{name:'Close details'}).click();
  await page.goto('/get-quote');
  await expect(page.locator('.material-editor')).toHaveCount(2);
  await page.getByRole('button',{name:'Preview request'}).click();
  const href = await page.getByRole('link',{name:'Continue in WhatsApp'}).getAttribute('href');
  const message = new URL(href!).searchParams.get('text')!;
  expect(message).toContain('3/4 inch');
  expect(message).toContain('1 inch');
  expect(message).toContain('20');
  expect(message).toContain('10');
});

test('API outage preserves public browsing without exposing account connection messages', async ({page})=>{
 await page.route('**/api/customer/me',route=>route.fulfill({status:503,body:''}));
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Retry connection'})).not.toBeVisible();
 await expect(page.getByText('Account connection unavailable.',{exact:false})).not.toBeVisible();
 await expect(page.getByText('Discard unsaved changes & reload')).not.toBeVisible();
 const images=page.locator('.category-img-wrapper img');
 await expect(images).toHaveCount(5);
 for(const img of await images.all()) {
  expect(await img.getAttribute('src')).toContain('/images/categories/');
  await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 }
 await page.goto('/marketplace');
 await expect(page.locator('.catalog-product-card')).toHaveCount(0);
 await expect(page.getByText('Starter CPVC Pipe')).not.toBeVisible();
 await page.goto('/get-quote');
 await expect(page).toHaveURL(/\/account\?next=\/get-quote$/);
 await expect(page.getByRole('heading',{name:'Sign in with your mobile'})).toBeVisible();
});

test('privacy and terms pages describe the agreed V1 customer flow', async ({page})=>{
 await page.goto('/privacy');
 await expect(page.getByRole('heading',{name:'How we handle your information'})).toBeVisible();
 await expect(page.getByText(/public catalogue does not require an account/i)).toBeVisible();
 await expect(page.getByText(/aggregate counts of page views/i)).toBeVisible();
 await expect(page.getByRole('link',{name:'Read website terms'})).toBeVisible();
 await page.goto('/terms');
 await expect(page.getByRole('heading',{name:'Using the Material Square website'})).toBeVisible();
 await expect(page.getByText(/not an order, accepted quotation, payment, or delivery booking/i)).toBeVisible();
});

test('technical guides disclose review limits and contact page avoids unsupported delivery claims', async ({page})=>{
 await page.goto('/');
 await expect(page.getByText(/calculate exact conductor gauge/i)).not.toBeVisible();
 await expect(page.getByText(/Review illustrative cable-sizing examples/i)).toBeVisible();
 await expect(page.getByText(/procurement desk/i)).not.toBeVisible();
 await page.goto('/guides');
 await expect(page.getByRole('note')).toContainText('Professional verification required');
 await expect(page.getByText(/100% electrical safety/i)).not.toBeVisible();
 await page.goto('/contact');
 await expect(page.getByRole('heading',{name:'Tell us what your site needs.'})).toBeVisible();
 await expect(page.getByText(/10k\+ Delhi NCR builders/i)).not.toBeVisible();
 await expect(page.getByText(/guaranteed arrival/i)).not.toBeVisible();
});
