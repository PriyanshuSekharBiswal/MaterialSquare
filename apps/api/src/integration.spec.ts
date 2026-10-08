import { SITE_CONTENT_DEFAULTS } from "@material-square/types";
import { RFQ_ATTACHMENT_MAX_FILE_BYTES } from "@material-square/types";
import { randomUUID } from "node:crypto";
import { open, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { publicRateLimit } from "./common/rate-limit";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "./app.module";
import { JwtService } from "@nestjs/jwt";
import { hashPassword } from "./auth/password";
import { Msg91WidgetService } from "./auth/msg91-widget.service";
import request = require("supertest");
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
function indiaDateOffset(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return new Date(
    Date.UTC(value("year"), value("month") - 1, value("day") + offsetDays),
  )
    .toISOString()
    .slice(0, 10);
}
integration("API with isolated PostgreSQL", () => {
  let app: INestApplication;
  let db: PrismaClient;
  let token: string;
  let rfqId: string;
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET =
      "integration-test-only-secret-minimum-32-characters";
    delete process.env.REDIS_URL;
    db = new PrismaClient();
    const owner = await db.staffUser.upsert({
      where: { email: "integration@example.com" },
      update: { isActive: true, role: "SUPER_ADMIN" },
      create: {
        email: "integration@example.com",
        name: "Integration",
        role: "SUPER_ADMIN",
        passwordHash: hashPassword("Integration-test-password-1!"),
      },
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(publicRateLimit());
    const apiDoc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("Material Square API").build(),
    );
    SwaggerModule.setup("api/docs", app, apiDoc);
    await app.init();
    token = app.get(JwtService).sign({
      sub: owner.id,
      type: "STAFF",
      ver: owner.authVersion,
    });
  });
  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
  });
  it("serves API documentation with the patched dependencies", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/docs-json")
      .expect(200);
    expect(response.body.info.title).toBe("Material Square API");
    expect(response.body.paths).toHaveProperty("/api/rfqs");
  });
  it("blocks anonymous reads and mutations of staff data", async () => {
    for (const path of [
      "/quotes",
      "/orders",
      "/analytics/dashboard",
      "/rfqs",
      "/products/inventory",
    ])
      await request(app.getHttpServer()).get(`/api${path}`).expect(401);
    await request(app.getHttpServer())
      .patch("/api/products/no-id/price")
      .send({ basePricePerMt: 1 })
      .expect(401);
  });
  it("allows staff sign-in and customer OTP sessions", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ email: "someone@example.invalid", password: "not-a-password" })
      .expect(401);
    jest
      .spyOn(app.get(Msg91WidgetService), "verifyAccessToken")
      .mockResolvedValue("9876543210");
    const account = await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify-msg91")
      .send({
        phone: "9876543210",
        accessToken: "verified-test-access-token-12345",
      })
      .expect(200);
    expect(account.body.phone).toBe("9876543210");
    const cookie = account.headers["set-cookie"]?.[0]?.split(";")[0];
    expect(cookie).toMatch(/^ms_customer_session=/);
    expect(account.headers["set-cookie"]?.[0]).toContain("Max-Age=31536000");
    await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", cookie)
      .expect(200);
    const tooManyAttachments = request(app.getHttpServer())
      .post("/api/customer/rfqs")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .set("X-Material-Account", account.body.id)
      .field(
        "payload",
        JSON.stringify({
          customerName: "Verified Customer",
          siteLocation: "Plot 42, Sector 10",
          city: "Noida",
          pincode: "201301",
          items: [],
        }),
      );
    for (let index = 0; index < 11; index++)
      tooManyAttachments.attach(
        "attachments",
        Buffer.from("%PDF-1.7 synthetic QA attachment"),
        { filename: `plan-${index + 1}.pdf`, contentType: "application/pdf" },
      );
    await tooManyAttachments.expect(400);
    const uploadFixtureDirectory = await mkdtemp(
      join(tmpdir(), "rfq-upload-limit-test-"),
    );
    const oversizedAttachmentPath = join(
      uploadFixtureDirectory,
      "oversized-plan.pdf",
    );
    const oversizedAttachment = await open(oversizedAttachmentPath, "w");
    await oversizedAttachment.truncate(RFQ_ATTACHMENT_MAX_FILE_BYTES + 1);
    await oversizedAttachment.close();
    try {
      await request(app.getHttpServer())
        .post("/api/customer/rfqs")
        .set("Cookie", cookie)
        .set("X-Material-Square", "customer")
        .set("X-Material-Account", account.body.id)
        .field(
          "payload",
          JSON.stringify({
            customerName: "Verified Customer",
            siteLocation: "Plot 42, Sector 10",
            city: "Noida",
            pincode: "201301",
            items: [],
          }),
        )
        .attach("attachments", oversizedAttachmentPath, {
          filename: "oversized-plan.pdf",
          contentType: "application/pdf",
        })
        .expect(413);
    } finally {
      await rm(uploadFixtureDirectory, { recursive: true, force: true });
    }
    await request(app.getHttpServer())
      .post("/api/customer/quotations/not-a-quote/response")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .set("X-Material-Account", account.body.id)
      .send({ decision: "REQUEST_CHANGES", notes: "Change the quote" })
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/customer/activity")
      .expect(401);
    await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", cookie)
      .set("X-Material-Account", "a-different-account")
      .expect(409);
    await request(app.getHttpServer())
      .put("/api/customer/profile")
      .set("Cookie", cookie)
      .send({ name: "Verified Customer" })
      .expect(403);
    const savedProfile = await request(app.getHttpServer())
      .put("/api/customer/profile")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .set("X-Material-Account", account.body.id)
      .send({
        name: "Verified Customer",
        email: "customer@example.test",
        companyName: "Customer Build Co",
        city: "Noida",
        pincode: "201301",
      })
      .expect(200);
    expect(savedProfile.body).toMatchObject({
      id: account.body.id,
      name: "Verified Customer",
      companyName: "Customer Build Co",
      city: "Noida",
      pincode: "201301",
    });
    const listing = await db.catalogListing.create({
      data: {
        slug: `customer-rfq-${randomUUID()}`,
        name: "UltraTech PPC Cement",
        brand: "UltraTech Cement",
        category: "cement",
        categoryLabel: "Cement",
        unit: "bag",
        isPublished: true,
        variants: {
          create: {
            label: "50 kg",
            attributes: { pack: "50 kg" },
            unit: "bag",
            minOrderQuantity: 100,
            availabilityStatus: "OUT_OF_STOCK",
            isInStock: false,
            sortOrder: 0,
          },
        },
      },
      include: { variants: true },
    });
    const submitted = await request(app.getHttpServer())
      .post("/api/customer/rfqs")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .set("X-Material-Account", account.body.id)
      .send({
        customerName: "Verified Customer",
        email: "customer@example.test",
        companyName: "Customer Build Co",
        siteLocation: "Plot 42, Sector 10",
        city: "Noida",
        pincode: "201301",
        deliveryTiming: "2026-10-20",
        projectStage: "Foundation",
        notes: "Please confirm next delivery date.",
        items: [
          {
            catalogueId: listing.id,
            variantId: listing.variants[0].id,
            name: "Forged product name",
            brand: "Forged brand",
            category: "Forged category",
            unit: "forged unit",
            quantity: 120,
            specification: "forged specification",
          },
          {
            catalogueId: listing.id,
            name: "UltraTech PPC Cement",
            unit: "bulk delivery",
            quantity: 1,
            specification: "Delivery in a bulk tanker",
          },
        ],
      })
      .expect(201);
    const savedRfq = await db.rfq.findUniqueOrThrow({
      where: { id: submitted.body.id },
    });
    expect(savedRfq).toMatchObject({
      customerId: account.body.id,
      customerName: "Verified Customer",
      customerPhone: "9876543210",
      status: "NEW",
      siteLocation: "Plot 42, Sector 10, Noida 201301",
      deliveryTiming: "2026-10-20",
    });
    expect(savedRfq.items).toEqual([
      {
        catalogueId: listing.id,
        variantId: listing.variants[0].id,
        material: "UltraTech PPC Cement",
        brand: "UltraTech Cement",
        category: "Cement",
        quantity: 120,
        unit: "bag",
        specification: "50 kg · 50 kg",
        source: "client_catalogue",
      },
      {
        catalogueId: listing.id,
        variantId: null,
        material: "UltraTech PPC Cement",
        brand: "UltraTech Cement",
        category: "Cement",
        quantity: 1,
        unit: "bulk delivery",
        specification: "Delivery in a bulk tanker",
        source: "client_catalogue",
      },
    ]);
    const assignees = await request(app.getHttpServer())
      .get("/api/rfqs/assignees")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(assignees.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: expect.any(String), name: expect.any(String) })]),
    );
    const assignedStaffId = assignees.body[0].id as string;
    await request(app.getHttpServer())
      .patch(`/api/rfqs/${submitted.body.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        assignedStaffId,
        staffNotes: "Internal QA note — not customer-visible",
      })
      .expect(200);
    const staffReview = await request(app.getHttpServer())
      .get("/api/rfqs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(staffReview.body.find((row: { id: string }) => row.id === submitted.body.id)).toMatchObject({
      assignedStaffId,
      assignedStaff: { id: assignedStaffId },
      staffNotes: "Internal QA note — not customer-visible",
    });
    const customerActivity = await request(app.getHttpServer())
      .get("/api/customer/activity")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .set("X-Material-Account", account.body.id)
      .expect(200);
    const customerRequest = customerActivity.body.requests.find(
      (row: { id: string }) => row.id === submitted.body.id,
    );
    expect(customerRequest).toBeTruthy();
    expect(customerRequest).not.toHaveProperty("staffNotes");
    expect(customerRequest).not.toHaveProperty("assignedStaffId");
    expect(customerRequest).not.toHaveProperty("assignedStaff");
    await request(app.getHttpServer())
      .post("/api/customer/rfqs")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .set("X-Material-Account", account.body.id)
      .send({
        customerName: "Verified Customer",
        siteLocation: "Plot 42, Sector 10",
        city: "Noida",
        pincode: "201301",
        items: [
          {
            catalogueId: listing.id,
            variantId: listing.variants[0].id,
            name: listing.name,
            unit: "bag",
            quantity: 50,
          },
        ],
      })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/customer/rfqs")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .send({
        customerName: "Verified Customer",
        siteLocation: "Plot 42, Sector 10",
        city: "Noida",
        pincode: "201301",
        items: [],
      })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/customer/logout")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", cookie)
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/rfqs")
      .send({ customerName: "Guest", items: [] })
      .expect(404);
  });
  it("keeps staff RFQ review available without customer account routes", async () => {
    rfqId = randomUUID();
    await db.rfq.create({
      data: {
        id: rfqId,
        customerName: "Public enquiry",
        customerPhone: "9876543210",
        siteLocation: "Noida",
        items: [{ material: "Cement", quantity: 25, unit: "Bags" }],
      },
    });
    await request(app.getHttpServer()).get("/api/rfqs").expect(401);
    const list = await request(app.getHttpServer())
      .get("/api/rfqs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.some((r: { id: string }) => r.id === rfqId)).toBe(true);
    await request(app.getHttpServer())
      .patch(`/api/rfqs/${rfqId}/status`)
      .auth(token, { type: "bearer" })
      .send({ status: "CONTACTED" })
      .expect(200);
    const statusEvent = await db.auditLog.findFirstOrThrow({
      where: {
        entityType: "RFQ",
        entityId: rfqId,
        action: "RFQ_STATUS_UPDATED",
      },
    });
    expect(statusEvent.staffId).toBeTruthy();
    expect(statusEvent.metadata).toEqual({
      fields: ["status"],
      status: "CONTACTED",
    });
  });
  it("does not allow customer JWTs into the staff API", async () => {
    const customerToken = app
      .get(JwtService)
      .sign({ sub: "9876543210", phone: "9876543210", type: "CUSTOMER" });
    await request(app.getHttpServer())
      .get("/api/quotes")
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(401);
  });
  it("enforces business-area access through persisted staff roles", async () => {
    const roles = [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_MANAGER",
      "DISPATCH_OFFICER",
      "ACCOUNTS_MANAGER",
      "PROCUREMENT_HEAD",
      "CATALOG_MANAGER",
      "CONTENT_MANAGER",
    ] as const;
    const staffEmails = roles
      .filter((role) => role !== "SUPER_ADMIN")
      .map((role) => `role-${role.toLowerCase()}@integration.test`);
    const tokens = new Map<string, string>([["SUPER_ADMIN", token]]);

    try {
      for (const role of roles) {
        if (role === "SUPER_ADMIN") continue;
        const email = `role-${role.toLowerCase()}@integration.test`;
        await db.staffUser.upsert({
          where: { email },
          update: {
            name: `Role ${role}`,
            role,
            isActive: true,
          },
          create: {
            email,
            name: `Role ${role}`,
            role,
            passwordHash: hashPassword("Integration-test-password-1!"),
          },
        });
        const staff = await db.staffUser.findUniqueOrThrow({
          where: { email },
        });
        tokens.set(
          role,
          app.get(JwtService).sign({
            sub: staff.id,
            type: "STAFF",
            ver: staff.authVersion,
          }),
        );
      }

      const routeAccess = [
        {
          path: "/api/admin/audit",
          allowed: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          path: "/api/procurement",
          allowed: ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"],
        },
        {
          path: "/api/quotes",
          allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
        },
        {
          path: "/api/products/catalogue",
          allowed: [
            "SUPER_ADMIN",
            "ADMIN",
            "SALES_MANAGER",
            "CATALOG_MANAGER",
            "PROCUREMENT_HEAD",
          ],
        },
        {
          path: "/api/storage/media",
          allowed: [
            "SUPER_ADMIN",
            "ADMIN",
            "CATALOG_MANAGER",
            "CONTENT_MANAGER",
          ],
        },
        {
          path: "/api/transportation",
          allowed: ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"],
        },
        {
          path: "/api/commissions",
          allowed: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
        },
        {
          path: "/api/admin/site-content/draft",
          allowed: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"],
        },
        {
          path: "/api/reports/sales?from=2026-10-01&to=2026-10-05",
          allowed: [
            "SUPER_ADMIN",
            "ADMIN",
            "SALES_MANAGER",
            "ACCOUNTS_MANAGER",
          ],
        },
      ] as const;

      for (const role of roles) {
        const staffToken = tokens.get(role)!;
        for (const route of routeAccess) {
          const response = await request(app.getHttpServer())
            .get(route.path)
            .auth(staffToken, { type: "bearer" });
          const expectedStatus = (route.allowed as readonly string[]).includes(
            role,
          )
            ? 200
            : 403;
          if (response.status !== expectedStatus)
            throw new Error(
              `${role} access to ${route.path}: expected ${expectedStatus}, received ${response.status} ${JSON.stringify(response.body)}`,
            );
        }
      }
    } finally {
      await db.staffUser.deleteMany({ where: { email: { in: staffEmails } } });
    }
  });
  it("creates quotations with supplied products/rates and generates PDFs", async () => {
    const brand = await db.brand.upsert({
      where: { slug: "test-brand" },
      update: {},
      create: {
        name: "Test Brand",
        slug: "test-brand",
        carbonEquivMax: 0.4,
        yieldStrengthMinMpa: 550,
        elongationMinPct: 16,
      },
    });
    const product = await db.productSKU.create({
      data: {
        brandId: brand.id,
        name: "Test Steel",
        grade: "Fe 550D",
        diameterMm: 12,
        weightPerMeterKg: 0.888,
        basePricePerMt: 50000,
        availableStockMt: 0,
      },
    });
    const quote = await request(app.getHttpServer())
      .post("/api/quotes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerName: "Persistence Test",
        customerPhone: "9876543210",
        projectSiteAddress: "Noida sector 10",
        sitePincode: "201301",
        items: [{ productId: product.id, quantityMt: 2, unitPrice: 51000 }],
        freightAmount: 1000,
        taxPct: 18,
      })
      .expect(201);
    expect(Number(quote.body.totalAmount)).toBe(121360);
    expect(quote.body.items[0].product.name).toBe("Test Steel");
    const pdf = await request(app.getHttpServer())
      .get(`/api/quotes/${quote.body.id}/pdf`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("Content-Type", /pdf/);
    expect(pdf.body.slice(0, 4).toString()).toBe("%PDF");
    await request(app.getHttpServer())
      .get(`/api/customer/quotes/${quote.body.id}/pdf`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const verifyCustomer = jest
      .spyOn(app.get(Msg91WidgetService), "verifyAccessToken")
      .mockImplementation(async (accessToken) =>
        accessToken.startsWith("owner-") ? "9876543210" : "9876543211",
      );
    const ownerLogin = await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify-msg91")
      .send({ phone: "9876543210", accessToken: "owner-integration-token" })
      .expect(200);
    const ownerCookie = ownerLogin.headers["set-cookie"][0].split(";")[0];
    const customerPdf = await request(app.getHttpServer())
      .get(`/api/customer/quotes/${quote.body.id}/pdf`)
      .set("Cookie", ownerCookie)
      .expect(200)
      .expect("Content-Type", /pdf/);
    expect(customerPdf.headers["content-disposition"]).toContain(
      `Quotation-${quote.body.quoteNumber}.pdf`,
    );
    expect(customerPdf.body.slice(0, 4).toString()).toBe("%PDF");
    const otherLogin = await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify-msg91")
      .send({ phone: "9876543211", accessToken: "other-integration-token" })
      .expect(200);
    const otherCookie = otherLogin.headers["set-cookie"][0].split(";")[0];
    await request(app.getHttpServer())
      .get(`/api/customer/quotes/${quote.body.id}/pdf`)
      .set("Cookie", otherCookie)
      .expect(404);
    verifyCustomer.mockRestore();
    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(
      await db.notificationOutbox.count({
        where: { payload: { path: ["quoteId"], equals: quote.body.id } },
      }),
    ).toBe(2);
    const pendingRevision = await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/revisions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerName: "Persistence Test",
        customerPhone: "9876543210",
        projectSiteAddress: "Noida sector 10",
        sitePincode: "201301",
        items: [{ productId: product.id, quantity: 3, unitPrice: 51000 }],
        freightAmount: 1000,
        taxPct: 18,
      })
      .expect(201);
    const customerActivity = await request(app.getHttpServer())
      .get("/api/customer/activity")
      .set("Cookie", ownerCookie)
      .set("X-Material-Square", "customer")
      .set("X-Material-Account", ownerLogin.body.id)
      .expect(200);
    expect(
      customerActivity.body.quotations.some(
        (customerQuote: { id: string }) => customerQuote.id === quote.body.id,
      ),
    ).toBe(true);
    expect(
      customerActivity.body.quotations.some(
        (customerQuote: { id: string }) =>
          customerQuote.id === pendingRevision.body.id,
      ),
    ).toBe(false);
    const accepted = await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/acceptance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ channel: "WHATSAPP" })
      .expect(201);
    const deliveryOrder = await db.order.findUniqueOrThrow({
      where: { orderNumber: accepted.body.orderNumber },
    });
    const payment = await request(app.getHttpServer())
      .patch(`/api/orders/${deliveryOrder.id}/manual-payment`)
      .set("Authorization", `Bearer ${token}`)
      .send({ method: "UPI", reference: "QA-INTEGRATION-ONLY" })
      .expect(200);
    expect(payment.body).toMatchObject({
      manualPaymentStatus: "PAID",
      manualPaymentMethod: "UPI",
      manualPaymentReference: "QA-INTEGRATION-ONLY",
      manualPaymentRecordedBy: { name: "Integration" },
    });
    expect(payment.body.manualPaymentRecordedAt).toBeTruthy();
    const persistedPayment = await db.order.findUniqueOrThrow({
      where: { id: deliveryOrder.id },
    });
    expect(persistedPayment).toMatchObject({
      manualPaymentStatus: "PAID",
      manualPaymentMethod: "UPI",
      manualPaymentReference: "QA-INTEGRATION-ONLY",
      manualPaymentRecordedById: expect.any(String),
    });
    const paymentAudit = await db.auditLog.findFirstOrThrow({
      where: {
        entityId: deliveryOrder.id,
        action: "ORDER_OFFLINE_PAYMENT_RECORDED",
      },
    });
    expect(paymentAudit.staffId).toBeTruthy();
    expect(paymentAudit.metadata).toMatchObject({
      method: "UPI",
      reference: "QA-INTEGRATION-ONLY",
      amountInr: Number(deliveryOrder.grandTotal),
    });
    await request(app.getHttpServer())
      .patch(`/api/orders/${deliveryOrder.id}/manual-payment`)
      .set("Authorization", `Bearer ${token}`)
      .send({ method: "CASH" })
      .expect(409);
    const acceptedAudit = await db.auditLog.findFirstOrThrow({
      where: {
        entityId: deliveryOrder.id,
        action: "STAFF_QUOTATION_ACCEPTED_EXTERNALLY",
      },
    });
    expect(acceptedAudit.staffId).toBeTruthy();
    expect(acceptedAudit.metadata).toMatchObject({
      actorType: "STAFF",
      channel: "WHATSAPP",
      quoteId: quote.body.id,
      orderNumber: accepted.body.orderNumber,
    });
    const planUrl = `/api/transportation/${deliveryOrder.id}`;
    await db.loyaltyProgramSetting.upsert({
      where: { id: "default" },
      create: { enabled: true, pointsPer100Inr: 1 },
      update: { enabled: true, pointsPer100Inr: 1, minimumOrderValueInr: 0 },
    });
    await request(app.getHttpServer())
      .put(planUrl)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DELIVERED" })
      .expect(409);
    await request(app.getHttpServer())
      .put(planUrl)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PLANNED" })
      .expect(200);
    await request(app.getHttpServer())
      .put(planUrl)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DELIVERED" })
      .expect(409);
    for (const status of [
      "SCHEDULED",
      "DISPATCHED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
    ]) {
      await request(app.getHttpServer())
        .put(planUrl)
        .set("Authorization", `Bearer ${token}`)
        .send({ status })
        .expect(200);
    }
    const orderLines = await db.orderItem.findMany({
      where: { orderId: deliveryOrder.id },
    });
    expect(orderLines).toHaveLength(1);
    const orderedQuantity = orderLines[0].quantityMt.toNumber();
    const deliveredFirst = Math.floor((orderedQuantity / 2) * 1000) / 1000;
    await request(app.getHttpServer())
      .put(planUrl)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DELIVERED" })
      .expect(409);
    const partialAttempts = await Promise.all(
      [0, 1].map(() =>
        request(app.getHttpServer())
          .post(`${planUrl}/deliveries`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            items: [
              { orderItemId: orderLines[0].id, quantity: deliveredFirst },
            ],
            notes: "First truck",
          }),
      ),
    );
    expect(partialAttempts.map((attempt) => attempt.status).sort()).toEqual([
      201, 409,
    ]);
    const partialReceipt = partialAttempts.find(
      (attempt) => attempt.status === 201,
    )!;
    expect(partialReceipt.body.deliveryNumber).toMatch(/^MS-DLV-/);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: deliveryOrder.id } }))
        .status,
    ).toBe("PARTIALLY_DELIVERED");
    await request(app.getHttpServer())
      .post(`${planUrl}/deliveries`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ orderItemId: orderLines[0].id, quantity: orderedQuantity }],
      })
      .expect(409);
    await request(app.getHttpServer())
      .post(`${planUrl}/deliveries`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            orderItemId: orderLines[0].id,
            quantity: orderedQuantity - deliveredFirst,
          },
        ],
        notes: "Balance delivered",
      })
      .expect(201);
    await request(app.getHttpServer())
      .put(planUrl)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PLANNED" })
      .expect(409);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: deliveryOrder.id } }))
        .status,
    ).toBe("DELIVERED");
    expect(
      await db.orderDelivery.count({ where: { orderId: deliveryOrder.id } }),
    ).toBe(2);
    const receivedLine = await db.orderItem.findUniqueOrThrow({
      where: { id: orderLines[0].id },
      include: { deliveries: true },
    });
    expect(
      receivedLine.deliveries.reduce(
        (sum, delivery) => sum + delivery.quantity.toNumber(),
        0,
      ),
    ).toBeCloseTo(orderedQuantity, 3);
    const earnedBeforeRetry = await db.loyaltyTransaction.count({
      where: { orderId: deliveryOrder.id, type: "EARN" },
    });
    expect(earnedBeforeRetry).toBe(1);
    await request(app.getHttpServer())
      .put(planUrl)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DELIVERED", notes: "Delivery receipt verified" })
      .expect(200);
    expect(
      await db.loyaltyTransaction.count({
        where: { orderId: deliveryOrder.id, type: "EARN" },
      }),
    ).toBe(earnedBeforeRetry);
    const transportAudit = await db.auditLog.findMany({
      where: { entityId: deliveryOrder.id, entityType: "ORDER" },
      orderBy: { createdAt: "asc" },
    });
    expect(transportAudit.map((entry) => entry.action)).toEqual([
      "STAFF_QUOTATION_ACCEPTED_EXTERNALLY",
      "ORDER_OFFLINE_PAYMENT_RECORDED",
      "TRANSPORTATION_PLAN_CREATED",
      ...Array(4).fill("TRANSPORTATION_STATUS_CHANGED"),
      "ORDER_PARTIALLY_DELIVERED",
      "ORDER_DELIVERY_COMPLETED",
      "TRANSPORTATION_PLAN_UPDATED",
    ]);
    expect(
      transportAudit
        .filter(
          (entry) => entry.action !== "STAFF_QUOTATION_ACCEPTED_EXTERNALLY",
        )
        .every((entry) => entry.staffId !== null),
    ).toBe(true);
    expect(
      transportAudit.find(
        (entry) => entry.action === "ORDER_PARTIALLY_DELIVERED",
      )?.metadata,
    ).toMatchObject({
      status: "PARTIALLY_DELIVERED",
    });

    await db.loyaltyProgramSetting.update({
      where: { id: "default" },
      data: { enabled: false },
    });
    await request(app.getHttpServer())
      .post(`/api/quotes/${pendingRevision.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(409);
    expect(
      (
        await db.quotation.findUniqueOrThrow({
          where: { id: pendingRevision.body.id },
        })
      ).status,
    ).toBe("DRAFT");
    const staffOrders = await request(app.getHttpServer())
      .get("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      staffOrders.body.find(
        (entry: { id: string }) => entry.id === deliveryOrder.id,
      ),
    ).not.toHaveProperty("paidAmount");
    const transportPlans = await request(app.getHttpServer())
      .get("/api/transportation")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      transportPlans.body.find(
        (entry: { orderId: string }) => entry.orderId === deliveryOrder.id,
      ).order,
    ).not.toHaveProperty("paymentMode");

    const externallyAcceptedQuote = await request(app.getHttpServer())
      .post("/api/quotes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerName: "Persistence Test",
        customerPhone: "9876543210",
        projectSiteAddress: "Noida sector 10",
        sitePincode: "201301",
        items: [{ productId: product.id, quantityMt: 1, unitPrice: 51000 }],
        freightAmount: 0,
        taxPct: 18,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/quotes/${externallyAcceptedQuote.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const recordedAcceptance = await request(app.getHttpServer())
      .post(`/api/quotes/${externallyAcceptedQuote.body.id}/acceptance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ channel: "WHATSAPP" })
      .expect(201);
    const externalOrder = await db.order.findUniqueOrThrow({
      where: { orderNumber: recordedAcceptance.body.orderNumber },
      include: { items: true, procurementRequests: true },
    });
    expect(externalOrder.items).toHaveLength(1);
    expect(externalOrder.procurementRequests).toHaveLength(1);
    const externalAcceptanceAudit = await db.auditLog.findFirstOrThrow({
      where: {
        entityId: externalOrder.id,
        action: "STAFF_QUOTATION_ACCEPTED_EXTERNALLY",
      },
    });
    expect(externalAcceptanceAudit.staffId).toBeTruthy();
    expect(externalAcceptanceAudit.metadata).toMatchObject({
      actorType: "STAFF",
      channel: "WHATSAPP",
      quoteId: externallyAcceptedQuote.body.id,
      quoteNumber: externallyAcceptedQuote.body.quoteNumber,
      orderNumber: recordedAcceptance.body.orderNumber,
    });
    const challan = await request(app.getHttpServer())
      .post(`/api/orders/${externalOrder.id}/dispatch-challan`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        truckNumber: "QA-TRUCK-01",
        driverName: "Integration Driver",
        driverPhone: "9876543210",
        weighbridgeGrossKg: 12500,
        weighbridgeTareKg: 6200,
        estimatedArrival: "2026-10-10T10:00:00.000Z",
      })
      .expect(201);
    expect(challan.body).toMatchObject({
      orderId: externalOrder.id,
      truckNumber: "QA-TRUCK-01",
      driverName: "Integration Driver",
      netWeightKg: "6300",
    });
    const persistedChallan = await db.dispatchChallan.findUniqueOrThrow({
      where: { orderId: externalOrder.id },
    });
    expect(persistedChallan.challanNumber).toMatch(/^MS-DC-/);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: externalOrder.id } }))
        .status,
    ).toBe("LOADED_ON_TRUCK");
    const challanPdf = await request(app.getHttpServer())
      .get(`/api/orders/${externalOrder.id}/challan/pdf`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("Content-Type", /pdf/);
    expect(challanPdf.body.slice(0, 4).toString()).toBe("%PDF");
    for (let step = 1; step <= 5; step++) {
      await request(app.getHttpServer())
        .patch(`/api/orders/${externalOrder.id}/advance-dispatch`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    }
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: externalOrder.id } }))
        .status,
    ).toBe("DELIVERED");
    expect(
      await db.orderDelivery.count({ where: { orderId: externalOrder.id } }),
    ).toBe(1);
    const challanAudit = await db.auditLog.findFirstOrThrow({
      where: {
        entityId: externalOrder.id,
        action: "DISPATCH_CHALLAN_CREATED",
      },
    });
    expect(challanAudit.staffId).toBeTruthy();
    await request(app.getHttpServer())
      .post(`/api/quotes/${externallyAcceptedQuote.body.id}/acceptance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ channel: "WHATSAPP" })
      .expect(409);

    const catalogue = await request(app.getHttpServer())
      .get("/api/products")
      .expect(200);
    expect(
      catalogue.body.some(
        (item: { name: string }) => item.name === "Test Steel",
      ),
    ).toBe(false);
    await db.notificationOutbox.deleteMany({
      where: { payload: { path: ["quoteId"], equals: quote.body.id } },
    });
    await db.notificationOutbox.deleteMany({
      where: {
        payload: {
          path: ["quoteId"],
          equals: externallyAcceptedQuote.body.id,
        },
      },
    });
    await db.order.deleteMany({
      where: { orderNumber: recordedAcceptance.body.orderNumber },
    });
    await db.quotation.delete({
      where: { id: externallyAcceptedQuote.body.id },
    });
    await db.order.deleteMany({
      where: { orderNumber: accepted.body.orderNumber },
    });
    await db.quotation.delete({ where: { id: pendingRevision.body.id } });
    await db.quotation.delete({ where: { id: quote.body.id } });
    await db.productSKU.delete({ where: { id: product.id } });
  });
  it("filters notification outcomes in PostgreSQL without exposing payloads", async () => {
    const type = `integration-notification-${randomUUID()}`;
    const now = new Date();
    const payload = {
      phone: "9876543210",
      attachment: { contentBase64: "private-fixture" },
    };
    await db.notificationOutbox.createMany({
      data: [
        { type, payload },
        { type, payload, queuedAt: now },
        { type, payload, queuedAt: now, deliveredAt: now, failedAt: now },
        { type, payload, queuedAt: now, failedAt: now },
        {
          type,
          payload,
          queuedAt: now,
          failedAt: now,
          skippedAt: now,
          skipReason: "No longer eligible",
        },
      ],
    });
    try {
      for (const status of [
        "PENDING",
        "QUEUED",
        "DELIVERED",
        "FAILED",
        "SKIPPED",
      ]) {
        const response = await request(app.getHttpServer())
          .get(`/api/admin/notifications?type=${type}&status=${status}`)
          .set("Authorization", `Bearer ${token}`)
          .expect(200);
        expect(response.body.total).toBe(1);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].status).toBe(status);
        expect(response.body.items[0]).not.toHaveProperty("payload");
        expect(JSON.stringify(response.body)).not.toContain("private-fixture");
        expect(JSON.stringify(response.body)).not.toContain("9876543210");
      }
      await request(app.getHttpServer())
        .get("/api/admin/notifications?status=UNKNOWN")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
    } finally {
      await db.notificationOutbox.deleteMany({ where: { type } });
    }
  });
  it("activates discount rules and validates saved quantity ranges on partial updates", async () => {
    const rule = await request(app.getHttpServer())
      .post("/api/discount-rules")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Range check",
        minimumQuantity: 10,
        maximumQuantity: 20,
        percentageOff: 5,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/discount-rules/${rule.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isActive: true })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/discount-rules/${rule.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ minimumQuantity: 30 })
      .expect(400);
    expect(
      (
        await db.discountRule.findUniqueOrThrow({ where: { id: rule.body.id } })
      ).minimumQuantity?.toNumber(),
    ).toBe(10);
    expect(await db.auditLog.count({ where: { entityId: rule.body.id } })).toBe(
      2,
    );
    await request(app.getHttpServer())
      .patch(`/api/discount-rules/${rule.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        expectedUpdatedAt: "2000-01-01T00:00:00.000Z",
        percentageOff: 99,
      })
      .expect(409);
    expect(
      (
        await db.discountRule.findUniqueOrThrow({ where: { id: rule.body.id } })
      ).percentageOff.toNumber(),
    ).toBe(5);
    expect(await db.auditLog.count({ where: { entityId: rule.body.id } })).toBe(
      2,
    );

    await request(app.getHttpServer())
      .patch(`/api/discount-rules/${rule.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        minimumQuantity: null,
        maximumQuantity: null,
        category: null,
        startsAt: null,
        endsAt: null,
      })
      .expect(200);
    expect(
      await db.discountRule.findUniqueOrThrow({ where: { id: rule.body.id } }),
    ).toMatchObject({
      minimumQuantity: null,
      maximumQuantity: null,
      category: null,
      startsAt: null,
      endsAt: null,
    });

    await db.discountRule.delete({ where: { id: rule.body.id } });
  });
  it("records the actor and changed fields when website content is published", async () => {
    await db.websiteContent.deleteMany({ where: { id: "global" } });
    await db.auditLog.deleteMany({
      where: { entityType: "WEBSITE_CONTENT", entityId: "global" },
    });
    const content = {
      ...SITE_CONTENT_DEFAULTS,
      "home.title": "Integration audit headline",
    };
    await request(app.getHttpServer())
      .post("/api/admin/site-content/publish")
      .set("Authorization", `Bearer ${token}`)
      .send(content)
      .expect(201);
    const event = await db.auditLog.findFirstOrThrow({
      where: {
        entityType: "WEBSITE_CONTENT",
        entityId: "global",
        action: "WEBSITE_CONTENT_PUBLISHED",
      },
      include: { staff: true },
    });
    expect(event.staff?.name).toBe("Integration");
    expect(event.metadata).toEqual({
      changedFields: ["home.title"],
      changes: [
        {
          field: "home.title",
          before: SITE_CONTENT_DEFAULTS["home.title"],
          after: "Integration audit headline",
        },
      ],
    });
    await request(app.getHttpServer())
      .post("/api/admin/site-content/publish")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...content, "contact.phone": "bad" })
      .expect(400);
    expect(
      await db.auditLog.count({
        where: { entityType: "WEBSITE_CONTENT", entityId: "global" },
      }),
    ).toBe(1);
    expect(
      (await db.websiteContent.findUniqueOrThrow({ where: { id: "global" } }))
        .content,
    ).toEqual(content);
    await db.websiteContent.delete({ where: { id: "global" } });
    await db.auditLog.deleteMany({
      where: { entityType: "WEBSITE_CONTENT", entityId: "global" },
    });
  });
  it("preserves catalogue packs and units through quotation, order and procurement", async () => {
    const listing = await db.catalogListing.create({
      data: {
        slug: `quote-packs-${randomUUID()}`,
        name: "CPVC Pipe",
        brand: "Pack Brand",
        category: "pipes",
        categoryLabel: "Pipes",
        unit: "family",
        variants: {
          create: [{ label: "25 mm × 3 m", unit: "length", price: 320 }],
        },
      },
      include: { variants: true },
    });
    const payload = {
      customerName: "Persistence Test",
      customerPhone: "9876543210",
      projectSiteAddress: "Noida sector 10",
      sitePincode: "201301",
      freightAmount: 100,
      taxPct: 18,
      items: [
        {
          catalogueId: listing.id,
          variantId: listing.variants[0].id,
          quantity: 20,
          unitPrice: 300,
          specification: "Hot water",
        },
      ],
    };
    await request(app.getHttpServer())
      .post("/api/quotes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...payload,
        items: [{ ...payload.items[0], variantId: randomUUID() }],
      })
      .expect(400);
    const quote = await request(app.getHttpServer())
      .post("/api/quotes")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);
    expect(quote.body.items[0]).toMatchObject({
      productId: null,
      productName: "CPVC Pipe",
      brandName: "Pack Brand",
      unit: "length",
      specification: "25 mm × 3 m · Hot water",
      quantityMt: "20",
      lineTotal: "6000",
    });
    expect(Number(quote.body.totalAmount)).toBe(7180);
    const reminder = await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/followups`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        channel: "INTERNAL",
        scheduledAt: new Date(Date.now() + 2 * 3600000).toISOString(),
        notes: "Call customer",
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/quotes/${quote.body.id}/followups/${reminder.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "CANCELLED" })
      .expect(200);
    const reminderEvents = await db.auditLog.findMany({
      where: {
        entityId: quote.body.id,
        action: { startsWith: "QUOTATION_FOLLOWUP_" },
      },
      include: { staff: true },
    });
    expect(reminderEvents.map((entry) => entry.action).sort()).toEqual([
      "QUOTATION_FOLLOWUP_SCHEDULED",
      "QUOTATION_FOLLOWUP_UPDATED",
    ]);
    expect(
      reminderEvents.every((entry) => entry.staff?.name === "Integration"),
    ).toBe(true);

    await request(app.getHttpServer())
      .patch(`/api/quotes/${quote.body.id}/margin`)
      .set("Authorization", `Bearer ${token}`)
      .send({ marginPct: 0 })
      .expect(200);
    expect(
      await db.auditLog.count({
        where: { entityId: quote.body.id, action: "QUOTATION_MARGIN_ADJUSTED" },
      }),
    ).toBe(1);

    await db.catalogListing.update({
      where: { id: listing.id },
      data: {
        name: "Changed name",
        brand: "Changed brand",
        variants: {
          update: {
            where: { id: listing.variants[0].id },
            data: { unit: "Changed unit", label: "Changed size" },
          },
        },
      },
    });
    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const revisionInput = {
      ...payload,
      items: [{ ...payload.items[0], quantity: 30, unitPrice: 290 }],
    };
    const revision = await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/revisions`)
      .set("Authorization", `Bearer ${token}`)
      .send(revisionInput)
      .expect(201);
    expect(revision.body).toMatchObject({
      revisedFromId: quote.body.id,
      revisionNumber: 2,
      status: "DRAFT",
    });
    const edited = await request(app.getHttpServer())
      .patch(`/api/quotes/${revision.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...revisionInput, notes: "Updated draft notes" })
      .expect(200);
    expect(edited.body).toMatchObject({
      id: revision.body.id,
      quoteNumber: revision.body.quoteNumber,
      revisionNumber: 2,
      notes: "Updated draft notes",
    });
    expect(edited.body.items).toHaveLength(1);
    const audit = await request(app.getHttpServer())
      .get(`/api/admin/audit?entityId=${revision.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      audit.body.items.map((entry: { action: string }) => entry.action).sort(),
    ).toEqual(["QUOTATION_DRAFT_EDITED", "QUOTATION_REVISION_CREATED"]);
    expect(
      audit.body.items.every(
        (entry: { staff: { name: string } }) =>
          entry.staff.name === "Integration",
      ),
    ).toBe(true);
    expect(
      await db.auditLog.count({
        where: { entityId: quote.body.id, action: "QUOTATION_PUBLISHED" },
      }),
    ).toBe(1);

    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/revisions`)
      .set("Authorization", `Bearer ${token}`)
      .send(revisionInput)
      .expect(409);
    expect(
      (await db.quotation.findUniqueOrThrow({ where: { id: quote.body.id } }))
        .status,
    ).toBe("QUOTE_SENT");
    await request(app.getHttpServer())
      .get(`/api/customer/quotes/${revision.body.id}/pdf`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/quotes/${revision.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/quotes/${revision.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(revisionInput)
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/acceptance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ channel: "WHATSAPP" })
      .expect(409);
    const response = await request(app.getHttpServer())
      .post(`/api/quotes/${revision.body.id}/acceptance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ channel: "WHATSAPP" })
      .expect(201);
    const order = await db.order.findUniqueOrThrow({
      where: { orderNumber: response.body.orderNumber },
      include: { items: true },
    });
    expect(order.items[0]).toMatchObject({
      productName: "Changed name",
      brandName: "Changed brand",
      unit: "Changed unit",
      specification: "Changed size · Hot water",
    });
    expect(order.items[0].quantityMt.toNumber()).toBe(30);
    const procurement = await db.procurementRequest.findUniqueOrThrow({
      where: { requestNumber: response.body.procurementNumber },
    });
    expect(procurement.items).toEqual([
      {
        catalogVariantId: listing.variants[0].id,
        productName: "Changed name",
        brand: "Changed brand",
        category: "pipes",
        quantity: 30,
        requiredQuantity: 30,
        clientStockQuantity: 0,
        unit: "Changed unit",
        notes: "Changed size · Hot water",
      },
    ]);
    // The original snapshot remains intact even though the revision uses current catalogue details.
    expect(
      (
        await db.quotationItem.findFirstOrThrow({
          where: { quotationId: quote.body.id },
        })
      ).productName,
    ).toBe("CPVC Pipe");
    await request(app.getHttpServer())
      .post(`/api/quotes/${revision.body.id}/revisions`)
      .set("Authorization", `Bearer ${token}`)
      .send(revisionInput)
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/acceptance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ channel: "WHATSAPP" })
      .expect(409);
    await db.notificationOutbox.deleteMany({
      where: { payload: { path: ["quoteId"], equals: quote.body.id } },
    });
    await db.order.delete({ where: { id: order.id } });
    await db.notificationOutbox.deleteMany({
      where: { payload: { path: ["quoteId"], equals: revision.body.id } },
    });
    await db.quotation.delete({ where: { id: revision.body.id } });
    await db.quotation.delete({ where: { id: quote.body.id } });
    await db.catalogListing.delete({ where: { id: listing.id } });
  });
  it("rejects expired supplier quotes and preserves reviewed purchase order costs", async () => {
    const supplier = await db.supplier.create({
      data: {
        name: "PO Test Supplier",
        phone: "9876543210",
        address: "Industrial Area",
        city: "Noida",
        pincode: "201301",
        status: "ACTIVE",
      },
    });
    const procurement = await db.procurementRequest.create({
      data: {
        requestNumber: `PO-test-${randomUUID()}`,
        deliveryAddress: "Sector 10 Noida",
        deliveryCity: "Noida",
        deliveryPincode: "201301",
        items: [
          {
            productName: "Cement",
            category: "cement",
            quantity: 20,
            unit: "bag",
          },
        ],
      },
    });
    const quote = await db.supplierQuote.create({
      data: {
        requestId: procurement.id,
        supplierId: supplier.id,
        totalAmount: 8000,
        validUntil: new Date(Date.now() - 1000),
      },
    });
    const payload = {
      supplierQuoteId: quote.id,
      shippingAddress: procurement.deliveryAddress,
      shippingContact: "Site manager 9876543210",
      taxAmount: 1440,
      freightAmount: 300,
    };
    await request(app.getHttpServer())
      .post("/api/purchase-orders")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(409);
    expect(
      await db.purchaseOrder.count({ where: { supplierQuoteId: quote.id } }),
    ).toBe(0);
    await db.supplierQuote.update({
      where: { id: quote.id },
      data: { validUntil: new Date(Date.now() + 86400000) },
    });
    await db.supplier.update({
      where: { id: supplier.id },
      data: { status: "SUSPENDED" },
    });
    await request(app.getHttpServer())
      .post("/api/purchase-orders")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(409);
    await db.supplier.update({
      where: { id: supplier.id },
      data: { status: "ACTIVE" },
    });
    const po = await request(app.getHttpServer())
      .post("/api/purchase-orders")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);
    expect(Number(po.body.totalAmount)).toBe(9740);
    expect(po.body.shippingContact).toBe(payload.shippingContact);
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/${po.body.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const approved = await db.purchaseOrder.findUniqueOrThrow({
      where: { id: po.body.id },
    });
    const revisionInput = {
      expectedUpdatedAt: approved.updatedAt.toISOString(),
      reason: "Updated freight agreed with supplier",
      shippingAddress: payload.shippingAddress,
      shippingContact: payload.shippingContact,
      subtotal: 8000,
      taxAmount: 1440,
      freightAmount: 500,
    };
    const revised = await request(app.getHttpServer())
      .post(`/api/purchase-orders/${po.body.id}/revisions`)
      .set("Authorization", `Bearer ${token}`)
      .send(revisionInput)
      .expect(201);
    expect(revised.body).toMatchObject({
      revisionNumber: 2,
      status: "DRAFT",
      approvedById: null,
      approvedAt: null,
    });
    expect(Number(revised.body.totalAmount)).toBe(9940);
    expect(revised.body.revisionHistory).toEqual([
      expect.objectContaining({
        revisionNumber: 1,
        status: "APPROVED",
        totalAmount: "9740",
        reason: revisionInput.reason,
      }),
    ]);
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/${po.body.id}/revisions`)
      .set("Authorization", `Bearer ${token}`)
      .send(revisionInput)
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/${po.body.id}/send`)
      .set("Authorization", `Bearer ${token}`)
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/${po.body.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/${po.body.id}/send`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/${po.body.id}/send`)
      .set("Authorization", `Bearer ${token}`)
      .expect(409);
    const events = await db.auditLog.findMany({
      where: { entityId: po.body.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((entry) => entry.action)).toEqual([
      "PURCHASE_ORDER_CREATED",
      "PURCHASE_ORDER_APPROVED",
      "PURCHASE_ORDER_REVISED",
      "PURCHASE_ORDER_APPROVED",
      "PURCHASE_ORDER_SEND_QUEUED",
    ]);
    expect(events.every((entry) => entry.staffId !== null)).toBe(true);
    await db.purchaseOrder.delete({ where: { id: po.body.id } });
    await db.procurementRequest.delete({ where: { id: procurement.id } });
    await db.supplier.delete({ where: { id: supplier.id } });
  });
  it("allocates procurement quantities across suppliers without over-ordering", async () => {
    const suppliers = await Promise.all(
      ["Allocation Supplier One", "Allocation Supplier Two"].map(
        (name, index) =>
          db.supplier.create({
            data: {
              name,
              phone: `98765432${10 + index}`,
              address: "Industrial Area",
              city: "Noida",
              pincode: "201301",
              status: "ACTIVE",
            },
          }),
      ),
    );
    const procurement = await db.procurementRequest.create({
      data: {
        requestNumber: `Allocation-test-${randomUUID()}`,
        deliveryAddress: "Sector 10 Noida",
        deliveryCity: "Noida",
        deliveryPincode: "201301",
        items: [
          {
            productName: "Cement",
            category: "cement",
            quantity: 20,
            unit: "bag",
          },
        ],
      },
    });
    const quotePayload = (
      supplierId: string,
      quantity: number,
      unitPrice: number,
    ) => ({
      supplierId,
      items: [
        {
          productName: "Cement",
          brand: "",
          category: "cement",
          quantity,
          unit: "bag",
          unitPrice,
        },
      ],
      totalAmount: quantity * unitPrice,
      leadTimeDays: 3,
      available: true,
    });
    const saveQuote = (payload: ReturnType<typeof quotePayload>) =>
      request(app.getHttpServer())
        .post(`/api/procurement/${procurement.id}/quotes`)
        .set("Authorization", `Bearer ${token}`)
        .send(payload);
    const createPo = (supplierQuoteId: string) =>
      request(app.getHttpServer())
        .post("/api/purchase-orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          supplierQuoteId,
          shippingAddress: procurement.deliveryAddress,
          shippingContact: "Site manager 9876543210",
          taxAmount: 0,
          freightAmount: 0,
        });

    const firstQuote = await saveQuote(
      quotePayload(suppliers[0].id, 12, 100),
    ).expect(201);
    const firstPo = await createPo(firstQuote.body.id).expect(201);
    expect(firstPo.body.items).toEqual([
      expect.objectContaining({
        productName: "Cement",
        quantity: 12,
        unitPrice: 100,
      }),
    ]);
    await saveQuote(quotePayload(suppliers[0].id, 12, 101)).expect(409);

    await saveQuote(quotePayload(suppliers[1].id, 21, 90)).expect(400);
    const secondQuote = await saveQuote(
      quotePayload(suppliers[1].id, 10, 90),
    ).expect(201);
    await createPo(secondQuote.body.id).expect(409);
    await saveQuote(quotePayload(suppliers[1].id, 8, 90)).expect(201);
    const secondPo = await createPo(secondQuote.body.id).expect(201);
    expect(secondPo.body.items).toEqual([
      expect.objectContaining({
        productName: "Cement",
        quantity: 8,
        unitPrice: 90,
      }),
    ]);
    await saveQuote(quotePayload(suppliers[1].id, 9, 90)).expect(409);

    await db.purchaseOrder.deleteMany({ where: { requestId: procurement.id } });
    await db.procurementRequest.delete({ where: { id: procurement.id } });
    await db.supplier.deleteMany({
      where: { id: { in: suppliers.map(({ id }) => id) } },
    });
  });
  it("lets catalogue staff add, archive and publish partner brands used by customer search", async () => {
    const stored = await request(app.getHttpServer())
      .get("/api/products/catalogue/partner-brands")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    // Integration DBs are persistent between local test runs. Remove this test's
    // previously-added row and restore the seeded baseline before asserting it.
    const baseline = stored.body
      .filter(
        (brand: { id: string }) => brand.id !== "integration-future-brand",
      )
      .map((brand: { isActive: boolean }) => ({ ...brand, isActive: true }));
    await request(app.getHttpServer())
      .put("/api/products/catalogue/partner-brands")
      .set("Authorization", `Bearer ${token}`)
      .send(baseline)
      .expect(200);
    const initial = await request(app.getHttpServer())
      .get("/api/products/catalogue/partner-brands")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(initial.body).toHaveLength(17);
    expect(initial.body.map((brand: { name: string }) => brand.name)).toContain(
      "UltraTech Cement",
    );
    const next = initial.body.map(
      (brand: { isActive: boolean }, index: number) => ({
        ...brand,
        isActive: index !== 0,
      }),
    );
    next.push({
      id: "integration-future-brand",
      name: "Integration Future Brand",
      category: "Paints",
      tagline: "Future",
      isActive: true,
      sortOrder: next.length,
    });
    try {
      await request(app.getHttpServer())
        .put("/api/products/catalogue/partner-brands")
        .set("Authorization", `Bearer ${token}`)
        .send(next)
        .expect(200);
      const publicBrands = await request(app.getHttpServer())
        .get("/api/products/partner-brands")
        .expect(200);
      expect(publicBrands.body).toHaveLength(17);
      expect(
        publicBrands.body.map((brand: { name: string }) => brand.name),
      ).not.toContain("UltraTech Cement");
      expect(
        publicBrands.body.map((brand: { name: string }) => brand.name),
      ).toContain("Integration Future Brand");
      const adminBrands = await request(app.getHttpServer())
        .get("/api/products/catalogue/partner-brands")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(adminBrands.body).toHaveLength(18);
      expect(adminBrands.body[0].isActive).toBe(false);
    } finally {
      await request(app.getHttpServer())
        .put("/api/products/catalogue/partner-brands")
        .set("Authorization", `Bearer ${token}`)
        .send(baseline)
        .expect(200);
    }
  });

  it("lets staff publish, price, edit and unpublish public catalogue products", async () => {
    const payload = {
      slug: "integration-cpvc-pipe",
      code: "MS-INT-CPVC-1",
      name: "Integration CPVC Pipe",
      brand: "Test Brand",
      brandTagline: "Test range",
      category: "pipes",
      categoryLabel: "Pipes & Fittings",
      unit: "3 m length",
      packaging: "Single length",
      image: "/images/products/cpvc-pipe-illustration.png",
      grade: "CPVC",
      description: "Integration product for catalogue testing.",
      minOrderQty: "1 length",
      dispatchTime: "Confirm with staff",
      price: 320,
      compareAtPrice: 400,
      priceNote: "per length, GST extra",
      offerLabel: "Test offer",
      offerStartsAt: indiaDateOffset(0),
      offerEndsAt: indiaDateOffset(1),
      isInStock: true,
      isPublished: true,
      features: ["Corrosion resistant"],
      applications: ["Water supply"],
      specifications: { size: "25 mm" },
      variants: [
        {
          code: "MS-INT-CPVC-1-3M",
          label: "25 mm · 3 m length",
          attributes: { diameter: "25 mm", length: "3 m" },
          unit: "3 m length",
          image: "/client/variants/cpvc-25mm.jpg",
          galleryImages: ["/client/variants/cpvc-25mm-detail.jpg"],
          price: 320,
          compareAtPrice: 400,
          isInStock: true,
          sortOrder: 0,
          quantityBreaks: [
            { minimumQuantity: 10, unitPrice: 300 },
            { minimumQuantity: 30, unitPrice: 280 },
          ],
        },
      ],
      sortOrder: 999,
    };
    await db.catalogListing.deleteMany({
      where: { slug: payload.slug, name: payload.name },
    });
    const created = await request(app.getHttpServer())
      .post("/api/products/catalogue")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);
    const listing = await request(app.getHttpServer())
      .get("/api/products")
      .expect(200);
    expect(
      listing.body.find((item: { id: string }) => item.id === created.body.id),
    ).not.toHaveProperty("basePricePerMt");
    expect(listing.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          name: payload.name,
          code: payload.code,
          inStock: true,
          price: "320",
          compareAtPrice: "400",
          priceNote: payload.priceNote,
          offerLabel: payload.offerLabel,
          offerStartsAt: `${payload.offerStartsAt}T00:00:00.000Z`,
          offerEndsAt: `${payload.offerEndsAt}T00:00:00.000Z`,
          specs: payload.specifications,
          variants: [
            expect.objectContaining({
              code: "MS-INT-CPVC-1-3M",
              image: "/client/variants/cpvc-25mm.jpg",
              galleryImages: ["/client/variants/cpvc-25mm-detail.jpg"],
              quantityBreaks: [
                { minimumQuantity: 10, unitPrice: 300 },
                { minimumQuantity: 30, unitPrice: 280 },
              ],
            }),
          ],
        }),
      ]),
    );

    const internalSupplier = await db.supplier.create({
      data: {
        name: `Private Supplier ${randomUUID()}`,
        phone: "9898989898",
        address: "Internal sourcing address",
        city: "Noida",
        pincode: "201301",
        status: "ACTIVE",
      },
    });
    try {
      const publicVariant = await db.catalogListingVariant.findFirstOrThrow({
        where: { listingId: created.body.id },
      });
      await db.supplierProduct.create({
        data: {
          supplierId: internalSupplier.id,
          catalogVariantId: publicVariant.id,
          productName: payload.name,
          brand: payload.brand,
          category: payload.category,
          unit: payload.unit,
          availableQuantity: 321,
          lastQuotedPrice: 987654321,
        },
      });
      const publicCatalogueWithSupplier = await request(app.getHttpServer())
        .get("/api/products")
        .expect(200);
      const publicListing = publicCatalogueWithSupplier.body.find(
        (item: { id: string }) => item.id === created.body.id,
      );
      expect(publicListing).toBeTruthy();
      expect(publicListing).not.toHaveProperty("supplierProducts");
      expect(publicListing).not.toHaveProperty("suppliers");
      expect(JSON.stringify(publicListing)).not.toContain(internalSupplier.name);
      expect(JSON.stringify(publicListing)).not.toContain(internalSupplier.phone);
      expect(JSON.stringify(publicListing)).not.toContain("987654321");
    } finally {
      await db.supplierProduct.deleteMany({
        where: { supplierId: internalSupplier.id },
      });
      await db.supplier.delete({ where: { id: internalSupplier.id } });
    }

    await request(app.getHttpServer())
      .post("/api/products/catalogue")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...payload,
        slug: "invalid-dated-offer",
        code: "MS-INT-INVALID-DATE",
        offerStartsAt: indiaDateOffset(2),
        offerEndsAt: indiaDateOffset(1),
      })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/products/catalogue")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...payload,
        slug: "invalid-quantity-breaks",
        code: "MS-INT-INVALID-QUANTITY",
        variants: [
          {
            ...payload.variants[0],
            quantityBreaks: [
              { minimumQuantity: 30, unitPrice: 280 },
              { minimumQuantity: 10, unitPrice: 300 },
            ],
          },
        ],
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/products/catalogue/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...payload, isPublished: false })
      .expect(200);
    const publicAfterUnpublish = await request(app.getHttpServer())
      .get("/api/products")
      .expect(200);
    expect(
      publicAfterUnpublish.body.some(
        (item: { id: string }) => item.id === created.body.id,
      ),
    ).toBe(false);
    await db.catalogListing.delete({ where: { id: created.body.id } });
  });
  it("records anonymous website events and serves aggregate analytics to permitted staff only", async () => {
    const before = await request(app.getHttpServer())
      .get("/api/analytics/overview?days=30")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/analytics/events")
      .send({ type: "page_view", target: "home" })
      .expect(201, { recorded: true });
    await request(app.getHttpServer())
      .post("/api/analytics/events")
      .send({ type: "page_view", target: "?q=someone@example.com" })
      .expect(400);
    const after = await request(app.getHttpServer())
      .get("/api/analytics/overview?days=30")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(after.body.totals.pageViews).toBe(before.body.totals.pageViews + 1);
    expect(after.body.topPages).toEqual(
      expect.arrayContaining([expect.objectContaining({ page: "home" })]),
    );
    expect(after.body.privacy).toContain("no visitor IDs");
    expect(after.body).not.toHaveProperty("visitors");
    await request(app.getHttpServer())
      .get("/api/analytics/overview")
      .expect(401);
  });
  it("keeps RFQs after restarting the application", async () => {
    await app.close();
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(publicRateLimit());
    await app.init();
    const list = await request(app.getHttpServer())
      .get("/api/rfqs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.some((r: { id: string }) => r.id === rfqId)).toBe(true);
    await db.rfq.delete({ where: { id: rfqId } });
  });
  it("persists supplier catalogue edits and expert publication changes", async () => {
    const supplier = await request(app.getHttpServer())
      .post("/api/suppliers")
      .auth(token, { type: "bearer" })
      .send({
        name: "Integration Supplier",
        phone: "9876543210",
        address: "Industrial Area",
        city: "Noida",
        pincode: "201301",
        status: "ACTIVE",
      })
      .expect(201);
    const expert = await request(app.getHttpServer())
      .post("/api/admin/experts")
      .auth(token, { type: "bearer" })
      .send({
        name: "Integration Advisor",
        serviceType: "Architecture",
        expertise: "Planning",
        phone: "9876543210",
        isPublished: false,
      })
      .expect(201);
    try {
      const product = await request(app.getHttpServer())
        .post(`/api/suppliers/${supplier.body.id}/products`)
        .auth(token, { type: "bearer" })
        .send({
          productName: "UltraTech Cement",
          brand: "UltraTech",
          category: "Cement",
          unit: "bag",
          minimumOrderQty: 10,
          availableQuantity: 300,
          lastQuotedPrice: 200,
        })
        .expect(201);
      const search = await request(app.getHttpServer())
        .get("/api/suppliers?q=UltraTech")
        .auth(token, { type: "bearer" })
        .expect(200);
      expect(search.body[0]).toMatchObject({
        id: supplier.body.id,
        products: [
          expect.objectContaining({
            productName: "UltraTech Cement",
            brand: "UltraTech",
            availableQuantity: "300",
          }),
        ],
      });
      await request(app.getHttpServer())
        .patch(`/api/suppliers/${supplier.body.id}/products/${product.body.id}`)
        .auth(token, { type: "bearer" })
        .send({
          isActive: false,
          lastQuotedPrice: null,
          availableQuantity: 280,
        })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/suppliers/${randomUUID()}/products/${product.body.id}`)
        .auth(token, { type: "bearer" })
        .send({ unit: "Boxes" })
        .expect(404);
      const detail = await request(app.getHttpServer())
        .get(`/api/suppliers/${supplier.body.id}`)
        .auth(token, { type: "bearer" })
        .expect(200);
      expect(detail.body.products[0]).toMatchObject({
        isActive: false,
        lastQuotedPrice: null,
        unit: "bag",
        availableQuantity: "280",
      });
      await request(app.getHttpServer())
        .patch(`/api/suppliers/${supplier.body.id}`)
        .auth(token, { type: "bearer" })
        .send({
          status: "SUSPENDED",
          city: "Ghaziabad",
          servicePincodes: ["201301", "201310"],
        })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/admin/experts/${expert.body.id}`)
        .auth(token, { type: "bearer" })
        .send({
          phone: null,
          name: "Updated Integration Advisor",
          isPublished: true,
        })
        .expect(200);
      const published = await request(app.getHttpServer())
        .get("/api/experts")
        .expect(200);
      expect(
        published.body.find(
          (entry: { id: string }) => entry.id === expert.body.id,
        ),
      ).toMatchObject({ name: "Updated Integration Advisor", phone: null });
      await request(app.getHttpServer())
        .patch(`/api/admin/experts/${expert.body.id}`)
        .auth(token, { type: "bearer" })
        .send({ isPublished: false })
        .expect(200);
      const expertEvents = await db.auditLog.findMany({
        where: { entityType: "EXPERT_ADVISOR", entityId: expert.body.id },
        orderBy: { createdAt: "asc" },
      });
      expect(expertEvents.map((event) => event.action)).toEqual([
        "EXPERT_CREATED",
        "EXPERT_PUBLISHED",
        "EXPERT_UPDATED",
      ]);
      expect(
        JSON.stringify(expertEvents.map((event) => event.metadata)),
      ).not.toContain("9876543210");
      const hidden = await request(app.getHttpServer())
        .get("/api/experts")
        .expect(200);
      expect(
        hidden.body.some(
          (entry: { id: string }) => entry.id === expert.body.id,
        ),
      ).toBe(false);
    } finally {
      await db.supplierProduct.deleteMany({
        where: { supplierId: supplier.body.id },
      });
      await db.supplier.delete({ where: { id: supplier.body.id } });
      await db.expertAdvisor.delete({ where: { id: expert.body.id } });
    }
  });

  it("publishes and archives blog articles with transactional audit history", async () => {
    const slug = `integration-${randomUUID()}`;
    let blogId: string | undefined;
    const created = await request(app.getHttpServer())
      .post("/api/admin/blogs")
      .auth(token, { type: "bearer" })
      .send({
        title: "Integration article",
        slug,
        summary: "An integration test article about building materials.",
        body: "Draft editorial copy for the database-backed content integration test.",
      })
      .expect(201);
    blogId = created.body.id;
    try {
      await request(app.getHttpServer())
        .patch(`/api/admin/blogs/${blogId}`)
        .auth(token, { type: "bearer" })
        .send({
          status: "PUBLISHED",
          body: "Published editorial copy for the content integration test.",
        })
        .expect(200);
      await request(app.getHttpServer()).get(`/api/blogs/${slug}`).expect(200);
      await request(app.getHttpServer())
        .delete(`/api/admin/blogs/${blogId}`)
        .auth(token, { type: "bearer" })
        .expect(200);
      await request(app.getHttpServer()).get(`/api/blogs/${slug}`).expect(404);

      const events = await db.auditLog.findMany({
        where: { entityType: "BLOG_POST", entityId: blogId },
        orderBy: { createdAt: "asc" },
      });
      expect(events.map((event) => event.action)).toEqual([
        "BLOG_CREATED",
        "BLOG_PUBLISHED",
        "BLOG_ARCHIVED",
      ]);
      expect(
        JSON.stringify(events.map((event) => event.metadata)),
      ).not.toContain("Published editorial copy");
    } finally {
      if (blogId) {
        await db.auditLog.deleteMany({
          where: { entityType: "BLOG_POST", entityId: blogId },
        });
        await db.blogPost.delete({ where: { id: blogId } });
      }
    }
  });
});
