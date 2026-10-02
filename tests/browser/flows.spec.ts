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
test.beforeEach(async ({ page }) => {
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
  await page.route("**/api/rfqs", (route) =>
    route.fulfill({ json: { id: "rfq-test-001", status: "NEW" } }),
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
  await page.getByRole("button", { name: "Submit quotation request" }).click();
  await expect(page.getByRole("status")).toContainText("rfq-test-001");
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
  await page.route("**/api/auth/customer/otp/request", (route) =>
    route.fulfill({ json: { success: true } }),
  );
  await page.route("**/api/auth/customer/otp/verify", (route) => {
    signedIn = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/customer/materials", (route) => {
    saved = route.request().postDataJSON().items;
    return route.fulfill({ json: { version: ++version } });
  });
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
  await page.getByLabel("Six-digit OTP").fill("654321");
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page).toHaveURL(/\/get-quote$/);
  await expect(page.locator(".material-editor")).toHaveCount(1);
  await expect.poll(() => saved.length).toBe(1);
});
test("OTP sign-in restores account and logout clears browser view", async ({
  page,
}) => {
  let signedIn = false;
  await page.route("**/api/customer/me", (route) =>
    route.fulfill(signedIn ? { json: customer } : { status: 401, json: {} }),
  );
  await page.route("**/api/auth/customer/otp/request", (route) =>
    route.fulfill({ json: { success: true } }),
  );
  await page.route("**/api/auth/customer/otp/verify", (route) => {
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
  await expect(page).toHaveURL(/\/get-quote$/);
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
    "Your changes are not saved",
  );
});

test("admin requires sign-in and displays login failures", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Mobile number", {exact:true}).fill("9000000000");
  await page.getByLabel("Password").fill("wrong-password");
  await page.route("**/api/auth/staff/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Invalid staff credentials" }),
    }),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid staff credentials");
  await expect(
    page.getByRole("button", { name: "RFQ inbox" }),
  ).not.toBeVisible();
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

test('account and request screens fit mobile and provide clear previews', async ({page})=>{
 await page.route('**/api/customer/me', route=>route.fulfill({json:{...customer,materialList:[{id:'cpvc',name:'CPVC pipe',brand:'Preferred brand',unit:'Pieces',quantity:20,specification:'3/4 inch'}]}}));
 await page.goto('/get-quote');
 await page.getByRole('button',{name:'Preview request'}).click();
 await page.screenshot({path:'/private/tmp/material-square-request-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/private/tmp/material-square-request-mobile.png',fullPage:true});
 await page.goto('/account');
 await expect(page.getByLabel('Full name')).toHaveValue('Test Customer');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/private/tmp/material-square-account-mobile.png',fullPage:true});
});

test('different pipe sizes remain separate after refresh and in request messages', async ({page}) => {
  let saved: unknown[] = [];
  let version = 0;
  await page.route('**/api/customer/me', route => route.fulfill({json:{...customer, materialList:saved, listVersion:version}}));
  await page.route('**/api/customer/materials', route => {
    const data = route.request().postDataJSON();
    saved = data.items;
    return route.fulfill({json:{version:++version}});
  });
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
  await page.screenshot({path:'/private/tmp/material-square-product-mobile.png'});
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
 for(const img of await images.all()) expect(await img.getAttribute('src')).toContain('/images/products/');
 await page.goto('/get-quote');
 await expect(page).toHaveURL(/\/account\?next=\/get-quote$/);
 await expect(page.getByRole('heading',{name:'Sign in with your mobile'})).toBeVisible();
});
