import { AuthService } from "./auth.service";
import { hashPassword, verifyPassword } from "./password";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { Msg91WidgetService } from "./msg91-widget.service";

describe("Authentication", () => {
  const sign = jest.fn(() => "signed-token");
  const verifyAccessToken = jest.fn();
  const db = {
    $transaction: jest.fn(),
    customer: { upsert: jest.fn() },
    customerSession: { create: jest.fn() },
    staffUser: { findUnique: jest.fn() },
  };
  let service: AuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = "unit-test-secret-that-is-long-enough";
    process.env.APP_ENV = "production";
    process.env.DEMO_AUTH_ENABLED = "false";
    db.$transaction.mockImplementation((callback) => callback(db));
    db.customer.upsert.mockResolvedValue({ id: "customer-1", isDemo: false });
    service = new AuthService(
      { sign } as unknown as JwtService,
      db as unknown as PrismaService,
      { verifyAccessToken } as unknown as Msg91WidgetService,
    );
  });

  it("checks the password, not the email domain", async () => {
    db.staffUser.findUnique.mockResolvedValue({
      id: "staff-1",
      email: "admin@materialsquare.in",
      isActive: true,
      isDemo: false,
      passwordHash: hashPassword("correct-password"),
      role: "SALES_MANAGER",
      name: "Staff",
      authVersion: 0,
    });
    await expect(
      service.loginStaff({
        email: "admin@materialsquare.in",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid staff credentials");
    expect(sign).not.toHaveBeenCalled();
    await service.loginStaff({
      email: "admin@materialsquare.in",
      password: "correct-password",
    });
    expect(sign).toHaveBeenCalledWith({ sub: "staff-1", type: "STAFF", ver: 0 });
  });

  it("rejects inactive staff and malformed stored hashes", async () => {
    expect(verifyPassword("anything", "not-a-valid-hash")).toBe(false);
    db.staffUser.findUnique.mockResolvedValue({ isActive: false });
    await expect(
      service.loginStaff({
        email: "admin@materialsquare.in",
        password: "password",
      }),
    ).rejects.toThrow();
  });

  it("creates a persistent customer session only for the phone verified by MSG91", async () => {
    verifyAccessToken.mockResolvedValue("9876543210");
    await service.verifyCustomerMsg91AccessToken({
      phone: "9876543210",
      accessToken: "msg91-access-token",
    });
    expect(verifyAccessToken).toHaveBeenCalledWith("msg91-access-token");
    expect(db.customer.upsert).toHaveBeenCalledWith({
      where: { phone: "9876543210" },
      update: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      create: expect.objectContaining({ phone: "9876543210", name: "", pincode: "", isDemo: false, lastLoginAt: expect.any(Date) }),
    });
    expect(db.customerSession.create).toHaveBeenCalledTimes(1);
    expect(db.customerSession.create.mock.calls[0][0].data.id).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  it("rejects a MSG91 token for a different phone number", async () => {
    verifyAccessToken.mockResolvedValue("9876543211");
    await expect(
      service.verifyCustomerMsg91AccessToken({
        phone: "9876543210",
        accessToken: "msg91-access-token",
      }),
    ).rejects.toThrow("Verified phone number does not match");
    expect(db.customer.upsert).not.toHaveBeenCalled();
  });
});
