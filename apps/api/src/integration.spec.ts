import { SITE_CONTENT_DEFAULTS } from "@material-square/types";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { publicRateLimit } from "./common/rate-limit";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "./app.module";
import { hashPassword } from "./auth/password";
import { Msg91WidgetService } from "./auth/msg91-widget.service";
import { JwtService } from "@nestjs/jwt";
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
  let portalCustomerId: string;
  let portalCookie: string;
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET =
      "integration-test-only-secret-minimum-32-characters";
    delete process.env.REDIS_URL;
    db = new PrismaClient();
    await db.staffUser.upsert({
      where: { email: "integration@example.com" },
      update: { isActive: true, role: "SUPER_ADMIN" },
      create: {
        email: "integration@example.com",
        name: "Integration",
        passwordHash: hashPassword("integration-password"),
        role: "SUPER_ADMIN",
      },
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Msg91WidgetService)
      .useValue({
        verifyAccessToken: async (accessToken: string) =>
          accessToken.slice(-10),
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(publicRateLimit());
    const apiDoc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("Material Square API").build(),
    );
    SwaggerModule.setup("api/docs", app, apiDoc);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (portalCustomerId && db) {
      await db.order.deleteMany({ where: { customerId: portalCustomerId } });
      await db.customerSession.deleteMany({
        where: { customerId: portalCustomerId },
      });
      await db.rfq.deleteMany({ where: { customerId: portalCustomerId } });
      await db.customer.deleteMany({ where: { id: portalCustomerId } });
    }
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
  it("returns 400 for invalid input rather than 500", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ email: "bad" })
      .expect(400);
  });
  it("saves customer RFQs and staff can retrieve them", async () => {
    const secret = randomBytes(32).toString("hex");
    const customer = await db.customer.create({
      data: {
        phone: "9876543210",
        name: "Persistence Test",
        pincode: "201301",
      },
    });
    portalCustomerId = customer.id;
    portalCookie = `ms_customer_session=${secret}`;
    await db.customerSession.create({
      data: {
        id: createHash("sha256").update(secret).digest("hex"),
        customerId: customer.id,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const requestId = randomUUID();
    const requestBody = {
      requestId,
      customerName: "Persistence Test",
      city: "Noida",
      pincode: "201301",
      siteLocation: "Noida",
      items: [{ material: "Cement", quantity: 25, unit: "Bags" }],
    };
    const saved = await request(app.getHttpServer())
      .post("/api/rfqs")
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send(requestBody)
      .expect(201);
    rfqId = saved.body.id;
    expect(await db.rfq.findUnique({ where: { id: rfqId } })).not.toBeNull();
    const retries = await Promise.all(
      [0, 1].map(() =>
        request(app.getHttpServer())
          .post("/api/rfqs")
          .set("Cookie", portalCookie)
          .set("X-Material-Square", "customer")
          .send(requestBody)
          .expect(201),
      ),
    );
    expect(retries.map((r) => r.body.id)).toEqual([requestId, requestId]);
    expect(await db.rfq.count({ where: { customerId: customer.id } })).toBe(1);
    await request(app.getHttpServer())
      .post("/api/rfqs")
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send({ ...requestBody, siteLocation: "Changed site" })
      .expect(409);

    const auth = await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({
        email: "integration@example.com",
        password: "integration-password",
      })
      .expect(200);
    token = auth.body.accessToken;
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
    const customerRequests = await request(app.getHttpServer())
      .get("/api/customer/activity")
      .set("Cookie", portalCookie)
      .expect(200);
    expect(
      customerRequests.body.requests.find(
        (r: { id: string; status: string }) => r.id === rfqId,
      ).status,
    ).toBe("CONTACTED");
  });
  it("does not allow customer JWTs into the staff API", async () => {
    const customerToken = app
      .get(JwtService)
      .sign({ sub: "9876543210", phone: "9876543210", type: "CUSTOMER" });
    await request(app.getHttpServer())
      .get("/api/quotes")
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(403);
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
    const password = "role-matrix-integration-password";
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
            passwordHash: hashPassword(password),
            role,
            isActive: true,
          },
          create: {
            email,
            name: `Role ${role}`,
            passwordHash: hashPassword(password),
            role,
          },
        });
        const login = await request(app.getHttpServer())
          .post("/api/auth/staff/login")
          .send({ email, password })
          .expect(200);
        tokens.set(role, login.body.accessToken);
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
          allowed: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "CATALOG_MANAGER"],
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
      .set("Cookie", portalCookie)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const customerPdf = await request(app.getHttpServer())
      .get(`/api/customer/quotes/${quote.body.id}/pdf`)
      .set("Cookie", portalCookie)
      .expect(200)
      .expect("Content-Type", /pdf/);
    expect(customerPdf.body.slice(0, 4).toString()).toBe("%PDF");
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
    const accepted = await request(app.getHttpServer())
      .post(`/api/customer/quotes/${quote.body.id}/respond`)
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send({ decision: "ACCEPT" })
      .expect(201);
    expect(accepted.body.orderNumber).toMatch(/^MS-ORD-/);
    const deliveryOrder = await db.order.findUniqueOrThrow({
      where: { orderNumber: accepted.body.orderNumber },
    });
    const acceptedAudit = await db.auditLog.findFirstOrThrow({
      where: {
        entityId: deliveryOrder.id,
        action: "CUSTOMER_QUOTATION_ACCEPTED",
      },
    });
    expect(acceptedAudit.staffId).toBeNull();
    expect(acceptedAudit.metadata).toMatchObject({
      actorType: "CUSTOMER",
      quoteId: quote.body.id,
      orderNumber: accepted.body.orderNumber,
      itemCount: 1,
      selectedAlternativeCount: 0,
    });
    expect(JSON.stringify(acceptedAudit.metadata)).not.toContain("9876543210");
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
      "CUSTOMER_QUOTATION_ACCEPTED",
      "TRANSPORTATION_PLAN_CREATED",
      ...Array(4).fill("TRANSPORTATION_STATUS_CHANGED"),
      "ORDER_PARTIALLY_DELIVERED",
      "ORDER_DELIVERY_COMPLETED",
      "TRANSPORTATION_PLAN_UPDATED",
    ]);
    expect(
      transportAudit
        .filter((entry) => entry.action !== "CUSTOMER_QUOTATION_ACCEPTED")
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
    const activity = await request(app.getHttpServer())
      .get("/api/customer/activity")
      .set("Cookie", portalCookie)
      .expect(200);
    expect(activity.body.quotations[0].status).toBe("CONVERTED_TO_ORDER");
    expect(activity.body.orders[0].orderNumber).toBe(accepted.body.orderNumber);
    expect(activity.body.orders[0]).not.toHaveProperty("paidAmount");
    expect(activity.body.orders[0]).not.toHaveProperty("paymentMode");
    expect(activity.body.orders[0].items[0].deliveries).toHaveLength(2);
    expect(activity.body.orders[0].deliveries).toHaveLength(2);
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

    const declinedQuote = await request(app.getHttpServer())
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
      .post(`/api/quotes/${declinedQuote.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/customer/quotes/${declinedQuote.body.id}/respond`)
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send({ decision: "REJECT" })
      .expect(201);
    const declinedAudit = await db.auditLog.findFirstOrThrow({
      where: {
        entityId: declinedQuote.body.id,
        action: "CUSTOMER_QUOTATION_DECLINED",
      },
    });
    expect(declinedAudit.staffId).toBeNull();
    expect(declinedAudit.metadata).toMatchObject({
      actorType: "CUSTOMER",
      quoteNumber: declinedQuote.body.quoteNumber,
      decision: "REJECT",
    });
    expect(JSON.stringify(declinedAudit.metadata)).not.toContain("9876543210");

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
        payload: { path: ["quoteId"], equals: declinedQuote.body.id },
      },
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
    await db.quotation.delete({ where: { id: declinedQuote.body.id } });
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
    expect(event.metadata).toEqual({ changedFields: ["home.title"] });
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
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
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
      .set("Cookie", portalCookie)
      .expect(404);
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
      .post(`/api/customer/quotes/${quote.body.id}/respond`)
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send({ decision: "ACCEPT" })
      .expect(409);
    const response = await request(app.getHttpServer())
      .post(`/api/customer/quotes/${revision.body.id}/respond`)
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send({ decision: "ACCEPT" })
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
        productName: "Changed name",
        brand: "Changed brand",
        category: "pipes",
        quantity: 30,
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
      .post(`/api/customer/quotes/${quote.body.id}/respond`)
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send({ decision: "ACCEPT" })
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
              quantityBreaks: [
                { minimumQuantity: 10, unitPrice: 300 },
                { minimumQuantity: 30, unitPrice: 280 },
              ],
            }),
          ],
        }),
      ]),
    );

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
  it("persists customer lists across sessions, isolates accounts and revokes logout", async () => {
    const phone = "9876543219";
    const signIn = async (number: string) => {
      const result = await request(app.getHttpServer())
        .post("/api/auth/customer/otp/verify-msg91")
        .set("X-Material-Square", "customer")
        .send({
          phone: number,
          accessToken: `mock-msg91-access-token-${number}`,
        })
        .expect(200);
      expect(result.body).toEqual({ success: true });
      const header = result.headers["set-cookie"][0];
      expect(header).toContain("HttpOnly");
      expect(header).toContain("SameSite=Lax");
      expect(header).toContain("Max-Age=2592000");
      const cookie = header.split(";")[0];
      expect(
        await db.customerSession.findUnique({
          where: { id: cookie.split("=")[1] },
        }),
      ).toBeNull();
      return cookie;
    };
    const cookie = await signIn(phone);
    await request(app.getHttpServer())
      .put("/api/customer/profile")
      .set("Cookie", cookie)
      .send({ name: "Blocked request" })
      .expect(403);
    await request(app.getHttpServer())
      .put("/api/customer/profile")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .set("Origin", "https://untrusted.example")
      .send({ name: "Blocked request" })
      .expect(403);
    await request(app.getHttpServer())
      .put("/api/customer/profile")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .send({ name: "Saved Customer", city: "Noida", pincode: "201301" })
      .expect(200);
    const material = {
      id: "pipe-test",
      catalogueId: "supreme-cpvc-quote-sample",
      variantId: "supreme-cpvc-20mm-pipe",
      name: "CPVC pipe",
      brand: "Test",
      unit: "Pieces",
      quantity: 20,
      specification: "3/4 inch",
      price: 40.96,
      compareAtPrice: 48.33,
      priceNote: "Indicative quotation rate; confirm with staff",
    };
    await request(app.getHttpServer())
      .put("/api/customer/materials")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .send({ version: 0, items: [material] })
      .expect(200);
    await request(app.getHttpServer())
      .put("/api/customer/materials")
      .set("Cookie", cookie)
      .set("X-Material-Square", "customer")
      .send({ version: 0, items: [] })
      .expect(409);
    const second = await signIn(phone);
    const restored = await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", second)
      .expect(200);
    expect(restored.body.name).toBe("Saved Customer");
    expect(restored.body.materialList).toEqual([material]);
    expect(restored.body).not.toHaveProperty("creditLimit");
    const other = await signIn("9876543218");
    const isolated = await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", other)
      .expect(200);
    expect(isolated.body.materialList).toEqual([]);
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
      .get("/api/customer/me")
      .set("Cookie", second)
      .expect(200);
    await db.customerSession.update({
      where: {
        id: createHash("sha256").update(second.split("=")[1]).digest("hex"),
      },
      data: { expiresAt: new Date(0) },
    });
    await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", second)
      .expect(401);
    await db.customer.deleteMany({
      where: { phone: { in: [phone, "9876543218"] } },
    });
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
          productName: "Pipe",
          category: "Pipes",
          unit: "Pieces",
          minimumOrderQty: 10,
          lastQuotedPrice: 200,
        })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/api/suppliers/${supplier.body.id}/products/${product.body.id}`)
        .auth(token, { type: "bearer" })
        .send({ isActive: false, lastQuotedPrice: null })
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
        unit: "Pieces",
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
