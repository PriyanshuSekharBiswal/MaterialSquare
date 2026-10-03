import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request = require("supertest");
import { AppModule } from "./app.module";
import { hashPassword } from "./auth/password";
import { demoAuthEnabled } from "./auth/demo-mode";
import { Msg91WidgetService } from "./auth/msg91-widget.service";
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration("Demo accounts and staff workspace with PostgreSQL", () => {
  let app: INestApplication, db: PrismaClient;
  const a = "8999000001",
    b = "8999000002",
    real = "8999000003",
    staffPhone = "8999000000",
    ownerPhone = "8999000004",
    managedPhone = "8999000005",
    ownerEmail = "demo-owner-integration@example.test",
    managedEmail = "catalog-manager-integration@example.test";
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
    delete process.env.REDIS_URL;
    db = new PrismaClient();
    await db.customer.deleteMany({ where: { phone: { in: [a, b, real] } } });
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
    })
      .overrideProvider(Msg91WidgetService)
      .useValue({
        verifyAccessToken: async (token: string) => token.slice(-10),
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });
  afterAll(async () => {
    if (followupId)
      await db.staffEnquiry.deleteMany({ where: { id: followupId } });
    await db.customer.deleteMany({ where: { phone: { in: [a, b, real] } } });
    await db.staffUser.deleteMany({
      where: { email: { in: ["demo-integration@example.test", ownerEmail, managedEmail] } },
    });
    await app?.close();
    await db?.$disconnect();
    delete process.env.DEMO_AUTH_ENABLED;
    delete process.env.APP_ENV;
  });
  async function login(phone: string) {
    const result = await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify-msg91")
      .set(headers)
      .send({ phone, accessToken: `mock-msg91-access-token-${phone}` })
      .expect(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    return result.headers["set-cookie"][0].split(";")[0];
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
  it("lets the owner manage role-scoped staff accounts, reset passwords, and revoke access", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/staff")
      .auth(staffToken, { type: "bearer" })
      .expect(403);

    const owner = await db.staffUser.create({
      data: {
        email: ownerEmail,
        phone: ownerPhone,
        name: "Demo owner",
        passwordHash: hashPassword("demo-owner-integration-password"),
        role: "SUPER_ADMIN",
        isDemo: true,
      },
    });
    const ownerLogin = await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ phone: ownerPhone, password: "demo-owner-integration-password" })
      .expect(200);
    const ownerToken = ownerLogin.body.accessToken;

    const roles = await request(app.getHttpServer())
      .get("/api/admin/staff/roles")
      .auth(ownerToken, { type: "bearer" })
      .expect(200);
    expect(roles.body.some((role: { role: string }) => role.role === "SUPER_ADMIN")).toBe(false);
    expect(roles.body.map((role: { role: string }) => role.role).sort()).toEqual([
      "ADMIN", "CATALOG_MANAGER", "SALES_MANAGER",
    ]);
    await request(app.getHttpServer())
      .post("/api/admin/staff")
      .auth(ownerToken, { type: "bearer" })
      .send({ name: "Future module user", phone: "8999000006", role: "PROCUREMENT_HEAD", password: "future-role-password" })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post("/api/admin/staff")
      .auth(ownerToken, { type: "bearer" })
      .send({
        name: "Catalogue manager",
        phone: managedPhone,
        email: managedEmail,
        role: "CATALOG_MANAGER",
        password: "catalog-manager-integration-password",
      })
      .expect(201);
    expect(created.body).not.toHaveProperty("passwordHash");

    const phoneLogin = await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ phone: managedPhone, password: "catalog-manager-integration-password" })
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ email: managedEmail, password: "catalog-manager-integration-password" })
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/products/catalogue")
      .auth(phoneLogin.body.accessToken, { type: "bearer" })
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/workspace/customers")
      .auth(phoneLogin.body.accessToken, { type: "bearer" })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/admin/staff/${created.body.id}/password`)
      .auth(ownerToken, { type: "bearer" })
      .send({ password: "catalog-manager-new-integration-password" })
      .expect(201);
    await request(app.getHttpServer())
      .get("/api/products/catalogue")
      .auth(phoneLogin.body.accessToken, { type: "bearer" })
      .expect(401);
    const resetLogin = await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ phone: managedPhone, password: "catalog-manager-new-integration-password" })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/admin/staff/${created.body.id}`)
      .auth(ownerToken, { type: "bearer" })
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/auth/staff/me")
      .auth(resetLogin.body.accessToken, { type: "bearer" })
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/auth/staff/login")
      .send({ phone: managedPhone, password: "catalog-manager-new-integration-password" })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/admin/staff")
      .auth(ownerToken, { type: "bearer" })
      .send({ name: "Second owner", phone: "8999000006", role: "SUPER_ADMIN", password: "another-integration-password" })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/admin/staff/${owner.id}`)
      .auth(ownerToken, { type: "bearer" })
      .send({ isActive: false })
      .expect(409);
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
  it("removes the demo OTP endpoints and only accepts MSG91 access tokens", async () => {
    await db.customer.create({
      data: {
        phone: real,
        name: "Real account",
        pincode: "201301",
        isDemo: false,
      },
    });
    await request(app.getHttpServer())
      .post("/api/auth/customer/otp/request")
      .set(headers)
      .send({ phone: real })
      .expect(404);
    await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify")
      .set(headers)
      .send({ phone: real, otp: "123456" })
      .expect(404);
    await request(app.getHttpServer())
      .post("/api/auth/customer/otp/verify-msg91")
      .set(headers)
      .send({ phone: real, accessToken: `mock-msg91-access-token-${real}` })
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
    await request(app.getHttpServer())
      .post("/api/auth/customer/otp/request")
      .set(headers)
      .send({ phone: a })
      .expect(404);
    process.env.DEMO_AUTH_ENABLED = "true";
    expect(() => demoAuthEnabled()).toThrow("requires APP_ENV=demo");
    process.env.DEMO_AUTH_ENABLED = "false";
  });
});
