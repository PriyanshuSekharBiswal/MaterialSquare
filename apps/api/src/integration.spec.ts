import { createHmac, createHash, randomBytes } from "node:crypto";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { publicRateLimit } from "./common/rate-limit";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "./app.module";
import { hashPassword } from "./auth/password";
import { JwtService } from "@nestjs/jwt";
import request = require("supertest");
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
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
      update: { isActive: true },
      create: {
        email: "integration@example.com",
        name: "Integration",
        passwordHash: hashPassword("integration-password"),
        role: "ADMIN",
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
  });
  afterAll(async () => {
    await app?.close();
    if (portalCustomerId && db) {
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
    expect(catalogue.body[0]).not.toHaveProperty("basePricePerMt");
    await db.notificationOutbox.deleteMany({
      where: { payload: { path: ["quoteId"], equals: quote.body.id } },
    });
    await db.order.deleteMany({ where: { orderNumber: accepted.body.orderNumber } });
    await db.quotation.delete({ where: { id: quote.body.id } });
    await db.productSKU.delete({ where: { id: product.id } });
  });
  it("persists customer lists across sessions, isolates accounts and revokes logout", async () => {
    const phone = "9876543219";
    const otp = "481962";
    const signIn = async (number: string) => {
      await db.otpSession.create({
        data: {
          phone: number,
          otpHash: createHmac("sha256", process.env.JWT_SECRET!)
            .update(`${number}:${otp}`)
            .digest("hex"),
          expiresAt: new Date(Date.now() + 60000),
        },
      });
      const result = await request(app.getHttpServer())
        .post("/api/auth/customer/otp/verify")
        .set("X-Material-Square", "customer")
        .send({ phone: number, otp })
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
    await db.otpSession.deleteMany({
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
