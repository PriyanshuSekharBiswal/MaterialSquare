import { createHash, randomBytes } from "node:crypto";
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
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day") + offsetDays))
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
      await db.customerSession.deleteMany({ where: { customerId: portalCustomerId } });
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
    const saved = await request(app.getHttpServer())
      .post("/api/rfqs")
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send({
        customerName: "Persistence Test",
        city: "Noida",
        pincode: "201301",
        siteLocation: "Noida",
        items: [{ material: "Cement", quantity: 25, unit: "Bags" }],
      })
      .expect(201);
    rfqId = saved.body.id;
    expect(await db.rfq.findUnique({ where: { id: rfqId } })).not.toBeNull();
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
    const customerPdf = await request(app.getHttpServer())
      .get(`/api/customer/quotes/${quote.body.id}/pdf`)
      .set("Cookie", portalCookie)
      .expect(200)
      .expect("Content-Type", /pdf/);
    expect(customerPdf.body.slice(0, 4).toString()).toBe("%PDF");
    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/quotes/${quote.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(
      await db.notificationOutbox.count({
        where: { payload: { path: ["quoteId"], equals: quote.body.id } },
      }),
    ).toBe(2);
    const accepted = await request(app.getHttpServer())
      .post(`/api/customer/quotes/${quote.body.id}/respond`)
      .set("Cookie", portalCookie)
      .set("X-Material-Square", "customer")
      .send({ decision: "ACCEPT" })
      .expect(201);
    expect(accepted.body.orderNumber).toMatch(/^MS-ORD-/);
    const activity = await request(app.getHttpServer())
      .get("/api/customer/activity")
      .set("Cookie", portalCookie)
      .expect(200);
    expect(activity.body.quotations[0].status).toBe("CONVERTED_TO_ORDER");
    expect(activity.body.orders[0].orderNumber).toBe(accepted.body.orderNumber);
    const catalogue = await request(app.getHttpServer())
      .get("/api/products")
      .expect(200);
    expect(catalogue.body.some((item: { name: string }) => item.name === "Test Steel")).toBe(false);
    await db.notificationOutbox.deleteMany({
      where: { payload: { path: ["quoteId"], equals: quote.body.id } },
    });
    await db.order.deleteMany({ where: { orderNumber: accepted.body.orderNumber } });
    await db.quotation.delete({ where: { id: quote.body.id } });
    await db.productSKU.delete({ where: { id: product.id } });
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
    expect(listing.body.find((item: { id: string }) => item.id === created.body.id))
      .not.toHaveProperty("basePricePerMt");
    expect(listing.body).toEqual(expect.arrayContaining([
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
      }),
    ]));

    await request(app.getHttpServer())
      .post("/api/products/catalogue")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...payload, slug: "invalid-dated-offer", code: "MS-INT-INVALID-DATE", offerStartsAt: indiaDateOffset(2), offerEndsAt: indiaDateOffset(1) })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/products/catalogue/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...payload, isPublished: false })
      .expect(200);
    const publicAfterUnpublish = await request(app.getHttpServer())
      .get("/api/products")
      .expect(200);
    expect(publicAfterUnpublish.body.some((item: { id: string }) => item.id === created.body.id)).toBe(false);
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
    expect(after.body.topPages).toEqual(expect.arrayContaining([
      expect.objectContaining({ page: "home" }),
    ]));
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
      name: "CPVC pipe",
      brand: "Test",
      unit: "Pieces",
      quantity: 20,
      specification: "3/4 inch",
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
});
