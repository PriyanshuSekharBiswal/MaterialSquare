import { test, expect } from "@playwright/test";
import { signInDemoStaff } from "./staff-session";
import { authenticateDemoCustomer } from "./customer-session";

test("staff can quote, record acceptance, procure and partially deliver an order", async ({
  page,
}) => {
  test.setTimeout(120000);
  const runId = Date.now().toString();
  const productName = `Browser workflow cement ${runId}`;
  const supplierName = `Browser workflow supplier ${runId}`;
  const customerName = `Browser workflow customer ${runId}`;
  const customerPhone = `987${runId.slice(-7)}`;
  const supplierPhone = `876${runId.slice(-7)}`;
  const deliveryAddress = `Workflow site ${runId}, Noida`;

  await signInDemoStaff(page);

  await page.getByRole("button", { name: "Business management" }).click();
  await page.getByRole("button", { name: "Suppliers", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill(supplierName);
  await page.getByLabel("Phone", { exact: true }).fill(supplierPhone);
  await page.getByLabel("Address", { exact: true }).fill("Industrial Area");
  await page.getByLabel("City", { exact: true }).fill("Noida");
  await page.getByLabel("PIN code", { exact: true }).fill("201301");
  await page.getByLabel("Supplier status").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Save supplier" }).click();
  const supplierCard = page
    .locator("article")
    .filter({ hasText: supplierName });
  await expect(supplierCard).toBeVisible();
  await supplierCard.getByPlaceholder("Product supplied").fill(productName);
  await supplierCard
    .getByPlaceholder("Brand", { exact: true })
    .fill("Workflow Brand");
  await supplierCard
    .getByPlaceholder("Category", { exact: true })
    .fill("cement");
  await supplierCard
    .getByPlaceholder("Unit", { exact: true })
    .fill("50 kg bag");
  await supplierCard.getByRole("button", { name: "Add product" }).click();
  await expect(supplierCard).toContainText("1 listed products");

  await page.getByRole("button", { name: "Products, prices & offers" }).click();
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel("Product name").fill(productName);
  await page
    .getByRole("textbox", { name: "Brand", exact: true })
    .fill("Workflow Brand");
  await page.getByLabel("Product code").fill(`E2E-${runId}`);
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

  await page.getByRole("button", { name: "Quotations & orders" }).click();
  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  const productSelect = page.getByLabel("Product for line 1");
  await expect
    .poll(() => productSelect.locator("option").allTextContents())
    .toEqual(expect.arrayContaining([expect.stringContaining(productName)]));
  const productOptions = await productSelect
    .locator("option")
    .allTextContents();
  const productOptionIndex = productOptions.findIndex((option) =>
    option.includes(productName),
  );
  expect(productOptionIndex).toBeGreaterThan(0);
  await productSelect.selectOption({ index: productOptionIndex });
  await page.getByLabel("Customer name", { exact: true }).fill(customerName);
  await page.getByLabel("Mobile number", { exact: true }).fill(customerPhone);
  await page
    .getByLabel("Delivery address", { exact: true })
    .fill(deliveryAddress);
  await page.getByLabel("PIN code", { exact: true }).fill("201301");
  await page.getByLabel("Quantity for line 1 (50 kg bag)").fill("10");
  await page.getByLabel("Rate for line 1 per 50 kg bag").fill("299");
  await page.getByRole("button", { name: "Save draft" }).click();
  const quotationCard = page
    .locator("article.record-card")
    .filter({ hasText: customerName });
  await expect(quotationCard).toContainText("DRAFT");
  await quotationCard
    .getByRole("button", { name: "Publish & queue notification" })
    .click();
  await expect(quotationCard).toContainText("QUOTE_SENT");

  const acceptanceResponse = page.waitForResponse(
    (response) =>
      /\/api\/quotes\/[^/]+\/acceptance$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await quotationCard
    .getByRole("button", { name: "Record customer acceptance" })
    .click();
  const accepted = await (await acceptanceResponse).json();
  expect(accepted.decision).toBe("ACCEPT");
  expect(accepted.procurementNumber).toMatch(/^MS-PR-/);

  await page.getByRole("button", { name: "Orders & dispatch" }).click();
  await expect(
    page.locator("article.record-card").filter({ hasText: customerName }),
  ).toContainText("PROCESSING_AT_YARD");
  const orders = await page.evaluate(async () => {
    const token = sessionStorage.getItem("ms-staff-token");
    const response = await fetch("/api/orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  });
  const order = orders.find(
    (candidate: { customerName: string }) =>
      candidate.customerName === customerName,
  );
  expect(order?.id).toBeTruthy();
  expect(order.items).toHaveLength(1);
  expect(order.items[0]).toMatchObject({
    productName,
    quantityMt: "10",
    unit: "50 kg bag",
  });
  const procurementRequests = await page.evaluate(async () => {
    const token = sessionStorage.getItem("ms-staff-token");
    const response = await fetch("/api/procurement", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  });
  const procurementRequest = procurementRequests.find(
    (candidate: { requestNumber: string }) =>
      candidate.requestNumber === accepted.procurementNumber,
  );
  expect(procurementRequest?.items).toEqual(
    expect.arrayContaining([expect.objectContaining({ productName })]),
  );
  expect(procurementRequest?.supplierQuotes).toEqual([]);

  await page.getByRole("button", { name: "Business management" }).click();
  await page.getByRole("button", { name: "Procurement", exact: true }).click();
  const procurementCard = page
    .locator("article.bc-record-block")
    .filter({ hasText: accepted.procurementNumber });
  await expect(procurementCard).toContainText(productName);
  await procurementCard
    .getByRole("button", { name: "Match suppliers" })
    .click();
  const supplierCandidate = procurementCard
    .locator("details")
    .filter({ hasText: supplierName });
  await expect(supplierCandidate).toBeVisible();
  await supplierCandidate.locator("summary").click();
  await supplierCandidate.locator('input[name="quantity-0"]').fill("10");
  await supplierCandidate.locator('input[name="price-0"]').fill("220");
  await supplierCandidate.locator('input[name="lead"]').fill("2");
  await supplierCandidate
    .getByRole("button", { name: "Save supplier quote" })
    .click();
  await expect(procurementCard).toContainText(supplierName);
  await procurementCard
    .getByRole("button", { name: `Review purchase order for ${supplierName}` })
    .click();
  await page.getByLabel("Shipping address").fill(deliveryAddress);
  await page.getByLabel("Shipping contact").fill(supplierPhone);
  await page.getByRole("button", { name: "Create purchase order" }).click();
  await expect(procurementCard).toContainText("MS-PO-");

  await page
    .getByRole("button", { name: "Transportation", exact: true })
    .click();
  const deliveryPlanForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "Plan an order delivery" }),
  });
  await page.getByLabel("Order ID").first().fill(order.id);
  await deliveryPlanForm.getByLabel("Destination").fill(deliveryAddress);
  await deliveryPlanForm.getByLabel("Transporter").fill("Workflow Logistics");
  await deliveryPlanForm.getByLabel("Vehicle number").fill("UP16E2E");
  await deliveryPlanForm.getByLabel("Driver name").fill("Workflow Driver");
  const estimatedArrival = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  await deliveryPlanForm.getByLabel("Estimated arrival").fill(estimatedArrival);
  await deliveryPlanForm
    .getByRole("button", { name: "Save delivery plan" })
    .click();
  const deliveryCard = page
    .locator("article.bc-record-block")
    .filter({ hasText: order.orderNumber });
  await expect(deliveryCard).toContainText("PLANNED");
  for (const status of [
    "SCHEDULED",
    "DISPATCHED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
  ]) {
    await deliveryCard
      .getByRole("button", { name: "Update delivery status" })
      .click();
    await deliveryCard.getByLabel("Delivery status").selectOption(status);
    await deliveryCard
      .getByRole("button", { name: "Save delivery update" })
      .click();
    await expect(deliveryCard).toContainText(status.replaceAll("_", " "));
  }
  await expect(deliveryCard).toContainText("OUT FOR DELIVERY");
  await deliveryCard.locator('input[name^="quantity-"]').fill("4");
  await deliveryCard
    .getByRole("button", { name: "Save delivered quantities" })
    .click();
  await expect(deliveryCard).toContainText("PARTIALLY DELIVERED");
  await expect(deliveryCard).toContainText("4 / 10 50 kg bag delivered");

  await authenticateDemoCustomer(page, customerPhone);
  await page.goto("http://127.0.0.1:4175/account");
  await expect(
    page.getByRole("heading", { name: "Your details" }),
  ).toBeVisible();
  const customerOrder = page
    .locator("article.activity-record")
    .filter({ hasText: order.orderNumber });
  await expect(customerOrder).toContainText(productName);
  await expect(customerOrder).toContainText("4 / 10 50 kg bag delivered");

  await page.goto("http://127.0.0.1:4176");
  await expect(
    page.getByRole("heading", { name: "Executive Overview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Quotations & orders" }).click();
  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  const comparisonProduct = page.getByLabel("Product for line 1");
  const comparisonOptions = await comparisonProduct
    .locator("option")
    .allTextContents();
  const comparisonProductIndex = comparisonOptions.findIndex((option) =>
    option.includes(productName),
  );
  expect(comparisonProductIndex).toBeGreaterThan(0);
  await comparisonProduct.selectOption({ index: comparisonProductIndex });
  await page.getByLabel("Customer name", { exact: true }).fill(customerName);
  await page.getByLabel("Mobile number", { exact: true }).fill(customerPhone);
  await page
    .getByLabel("Delivery address", { exact: true })
    .fill(deliveryAddress);
  await page.getByLabel("PIN code", { exact: true }).fill("201301");
  await page.getByLabel("Quantity for line 1 (50 kg bag)").fill("2");
  await page.getByLabel("Rate for line 1 per 50 kg bag").fill("299");
  await page
    .getByRole("button", { name: /Add brand comparison option/ })
    .click();
  const alternativeProduct = page.getByLabel("Product and brand");
  const alternativeOptions = await alternativeProduct
    .locator("option")
    .allTextContents();
  const alternativeProductIndex = alternativeOptions.findIndex((option) =>
    option.includes("Ambuja Kawach Water Shield Cement"),
  );
  expect(alternativeProductIndex).toBeGreaterThan(0);
  await alternativeProduct.selectOption({ index: alternativeProductIndex });
  await page.getByRole("button", { name: "Save draft" }).click();
  const comparisonQuoteDraft = page
    .locator("article.record-card")
    .filter({ hasText: customerName })
    .filter({ hasText: "DRAFT" })
    .last();
  await expect(comparisonQuoteDraft).toBeVisible();
  const quoteNumber = (
    await comparisonQuoteDraft.locator("p").first().innerText()
  ).split(" · ")[0];
  expect(quoteNumber).toMatch(/^MS-QT-/);
  const comparisonQuote = page
    .locator("article.record-card")
    .filter({ hasText: quoteNumber });
  await comparisonQuote
    .getByRole("button", { name: "Publish & queue notification" })
    .click();
  await expect(comparisonQuote).toContainText("QUOTE_SENT");

  await page.goto("http://127.0.0.1:4175/account");
  const customerComparisonQuote = page
    .locator("article.activity-record")
    .filter({ hasText: productName })
    .filter({ hasText: "quote sent" });
  await expect(customerComparisonQuote).toBeVisible();
  const brandChoice = customerComparisonQuote.getByLabel(
    "Compare and choose a brand",
  );
  const brandOptions = await brandChoice.locator("option").allTextContents();
  const ambujaOptionIndex = brandOptions.findIndex((option) =>
    option.includes("Ambuja Cement"),
  );
  expect(ambujaOptionIndex).toBeGreaterThan(0);
  await brandChoice.selectOption({ index: ambujaOptionIndex });
  await expect(customerComparisonQuote).toContainText(
    "Selected: Ambuja Cement · Ambuja Kawach Water Shield Cement",
  );
  const customerAcceptanceResponse = page.waitForResponse(
    (response) =>
      /\/api\/customer\/quotes\/[^/]+\/respond$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await customerComparisonQuote
    .getByRole("button", { name: "Accept quotation & create order" })
    .click();
  const customerAcceptance = await (await customerAcceptanceResponse).json();
  expect(customerAcceptance.decision).toBe("ACCEPT");
  expect(customerAcceptance.orderNumber).toMatch(/^MS-ORD-/);
  const chosenBrandOrder = page
    .locator("article.activity-record")
    .filter({ hasText: customerAcceptance.orderNumber });
  await expect(chosenBrandOrder).toContainText(
    "Ambuja Kawach Water Shield Cement",
  );
});
