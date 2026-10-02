import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request = require("supertest");
import { AppModule } from "./app.module";
import { hashPassword } from "./auth/password";
import { demoAuthEnabled } from "./auth/demo-mode";
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration("Demo accounts and staff workspace with PostgreSQL", () => {
  let app: INestApplication, db: PrismaClient;
  const a = "8999000001",
    b = "8999000002",
    real = "8999000003",
    staffPhone = "8999000000";
  const headers = {
    "X-Material-Square": "customer",
    Origin: "http://localhost:5173",
  };
  let cookieA: string, cookieA2: string, cookieB: string, staffToken: string;
  let followupId: string;
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET =
      "demo-integration-only-secret-at-least-32-characters";
    process.env.APP_ENV = "demo";
    process.env.DEMO_AUTH_ENABLED = "true";
    process.env.DEMO_CUSTOMER_PHONES = [a, b, real].join(",");
    delete process.env.OTP_WEBHOOK_URL;
    delete process.env.REDIS_URL;
    db = new PrismaClient();
    await db.customer.deleteMany({ where: { phone: { in: [a, b, real] } } });
    await db.otpSession.deleteMany({ where: { phone: { in: [a, b, real] } } });
    await db.staffUser.upsert({
      where: { email: "demo-integration@example.test" },
      update: { isDemo: true, isActive: true, phone: staffPhone },
      create: {
        email: "demo-integration@example.test",
        name: "Demo integration",
        phone: staffPhone,
        isDemo: true,
        role: "ADMIN",
        passwordHash: hashPassword("demo-integration-password"),
      },
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });
  afterAll(async () => {
    if (followupId)
      await db.staffEnquiry.deleteMany({ where: { id: followupId } });
    await db.customer.deleteMany({ where: { phone: { in: [a, b, real] } } });
    await db.otpSession.deleteMany({ where: { phone: { in: [a, b, real] } } });
    await db.staffUser.deleteMany({
      where: { email: "demo-integration@example.test" },
    });
    await app?.close();
    await db?.$disconnect();
    delete process.env.DEMO_AUTH_ENABLED;
    delete process.env.APP_ENV;
    delete process.env.DEMO_CUSTOMER_PHONES;
  });
  async function login(phone: string) {
    const result = await request(app.getHttpServer())
      .post("/api/auth/customer/otp/request")
      .set(headers)
      .send({ phone })
      .expect(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.body.demoOtp).toMatch(/^\d{6}$/);
    const verified = await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify")
      .set(headers)
      .send({ phone, otp: result.body.demoOtp })
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify")
      .set(headers)
      .send({ phone, otp: result.body.demoOtp })
      .expect(400);
    return verified.headers["set-cookie"][0].split(";")[0];
  }
  it("requires valid staff phone and password; anonymous staff reads are denied", async () => {
    await request(app.getHttpServer())
      .get("/api/workspace/customers")
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ phone: staffPhone, password: "wrong-password" })
      .expect(401);
    const result = await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ phone: staffPhone, password: "demo-integration-password" })
      .expect(200);
    staffToken = result.body.accessToken;
    await request(app.getHttpServer())
      .get("/api/auth/staff/me")
      .auth(staffToken, { type: "bearer" })
      .expect(200);
  });
  it("shares saved data for the same phone across sessions and isolates other phones", async () => {
    cookieA = await login(a);
    await request(app.getHttpServer())
      .put("/api/customer/profile")
      .set(headers)
      .set("Cookie", cookieA)
      .send({ name: "Demo Customer A", city: "Noida", pincode: "201301" })
      .expect(200);
    await request(app.getHttpServer())
      .put("/api/customer/materials")
      .set(headers)
      .set("Cookie", cookieA)
      .send({
        version: 0,
        items: [
          {
            id: "demo-pipe",
            catalogueId: "astral-cpvc-pro",
            name: "Pipe",
            brand: "Preferred",
            quantity: 12,
            unit: "Pieces",
            specification: "3/4 inch",
          },
        ],
      })
      .expect(200);
    await db.otpSession.updateMany({
      where: { phone: a },
      data: { createdAt: new Date(Date.now() - 60000) },
    });
    cookieA2 = await login(a);
    cookieB = await login(b);
    const same = await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", cookieA2)
      .expect(200);
    expect(same.body.name).toBe("Demo Customer A");
    expect(same.body.materialList[0].quantity).toBe(12);
    const other = await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", cookieB)
      .expect(200);
    expect(other.body.materialList).toEqual([]);
    expect(other.body.id).not.toBe(same.body.id);
    await request(app.getHttpServer())
      .put("/api/customer/materials")
      .set(headers)
      .set("X-Material-Account", same.body.id)
      .set("Cookie", cookieB)
      .send({ version: 0, items: [] })
      .expect(409);
    await request(app.getHttpServer())
      .put("/api/customer/materials")
      .set(headers)
      .set("Cookie", cookieA2)
      .send({ version: 0, items: [] })
      .expect(409);
    await request(app.getHttpServer())
      .get("/api/workspace/customers")
      .set("Cookie", cookieA)
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/customer/logout")
      .set(headers)
      .set("Cookie", cookieA)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", cookieA)
      .expect(401);
    await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", cookieA2)
      .expect(200);
  });
  it("records staff follow-ups and rejects stale edits", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/workspace/customers?q=8999000001")
      .auth(staffToken, { type: "bearer" })
      .expect(200);
    expect(list.body.total).toBe(1);
    const record = {
      customerName: "Demo Customer A",
      phone: a,
      source: "WHATSAPP",
      notes: "Received by staff",
      materials: [],
    };
    const created = await request(app.getHttpServer())
      .post("/api/workspace/followups")
      .auth(staffToken, { type: "bearer" })
      .send(record)
      .expect(201);
    followupId = created.body.id;
    await request(app.getHttpServer())
      .put(`/api/workspace/followups/${followupId}`)
      .auth(staffToken, { type: "bearer" })
      .send({ ...record, status: "CONTACTED", version: 0 })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/workspace/followups/${followupId}`)
      .auth(staffToken, { type: "bearer" })
      .send({ ...record, status: "CLOSED", version: 0 })
      .expect(409);
  });
  it("does not let displayed demo codes enter a real account", async () => {
    await db.customer.create({
      data: {
        phone: real,
        name: "Real account",
        pincode: "201301",
        isDemo: false,
      },
    });
    const result = await request(app.getHttpServer())
      .post("/api/auth/customer/otp/request")
      .set(headers)
      .send({ phone: real })
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify")
      .set(headers)
      .send({ phone: real, otp: result.body.demoOtp })
      .expect(400);
    const list = await request(app.getHttpServer())
      .get(`/api/workspace/customers?q=${real}`)
      .auth(staffToken, { type: "bearer" })
      .expect(200);
    expect(list.body.total).toBe(0);
  });
  it("turning off demo mode rejects demo customer sessions and staff tokens", async () => {
    process.env.DEMO_AUTH_ENABLED = "false";
    process.env.APP_ENV = "production";
    await request(app.getHttpServer())
      .get("/api/customer/me")
      .set("Cookie", cookieA2)
      .expect(401);
    await request(app.getHttpServer())
      .get("/api/workspace/overview")
      .auth(staffToken, { type: "bearer" })
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ phone: staffPhone, password: "demo-integration-password" })
      .expect(401);
    const result = await request(app.getHttpServer())
      .post("/api/auth/customer/otp/request")
      .set(headers)
      .send({ phone: a })
      .expect(503);
    expect(result.body.demoOtp).toBeUndefined();
    process.env.DEMO_AUTH_ENABLED = "true";
    expect(() => demoAuthEnabled()).toThrow("requires APP_ENV=demo");
    process.env.DEMO_AUTH_ENABLED = "false";
  });
});
