import { AuthService } from "./auth.service";
import { hashPassword, verifyPassword } from "./password";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { createHmac } from "node:crypto";
import { TwoFactorService } from "./twofactor.service";
describe("Authentication", () => {
  const sign = jest.fn(() => "signed-token");
  const db = {
    $transaction: jest.fn(),
    customer: { upsert: jest.fn() },
    customerSession: { create: jest.fn() },
    staffUser: { findUnique: jest.fn() },
    otpSession: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
  };
  let service: AuthService;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = "unit-test-secret-that-is-long-enough";
    delete process.env.OTP_WEBHOOK_URL;
    service = new AuthService(
      { sign } as unknown as JwtService,
      db as unknown as PrismaService,
      new TwoFactorService(),
    );
  });
  it("checks the password, not the email domain", async () => {
    db.staffUser.findUnique.mockResolvedValue({
      id: "staff-1",
      email: "admin@materialsquare.in",
      isActive: true,
      passwordHash: hashPassword("correct-password"),
      role: "SALES_MANAGER",
      name: "Staff",
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
    expect(sign).toHaveBeenCalledWith({ sub: "staff-1", type: "STAFF" });
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
  it("rejects the old test OTP without a valid session", async () => {
    db.otpSession.findFirst.mockResolvedValue(null);
    await expect(
      service.verifyCustomerOtp({ phone: "9876543210", otp: "1234" }),
    ).rejects.toThrow("Invalid or expired OTP");
    expect(sign).not.toHaveBeenCalled();
  });
  it("consumes an OTP once and rejects replay", async () => {
    const phone = "9876543210";
    const otp = "683921";
    db.otpSession.findFirst.mockResolvedValue({
      id: "otp-1",
      otpHash: createHmac("sha256", process.env.JWT_SECRET!)
        .update(`${phone}:${otp}`)
        .digest("hex"),
    });
    db.otpSession.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    db.$transaction.mockImplementation((callback) => callback(db));
    db.customer.upsert.mockResolvedValue({ id: "customer-1" });
    await service.verifyCustomerOtp({ phone, otp });
    await expect(service.verifyCustomerOtp({ phone, otp })).rejects.toThrow();
    expect(db.customerSession.create).toHaveBeenCalledTimes(1);
    expect(db.customerSession.create.mock.calls[0][0].data.id).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(sign).not.toHaveBeenCalled();
  });
  it("does not claim OTP delivery when no provider is configured", async () => {
    await expect(
      service.requestCustomerOtp({ phone: "9876543210" }),
    ).rejects.toThrow("OTP delivery is not configured");
  });
  it("invalidates an OTP session if the delivery provider fails", async () => {
    process.env.OTP_WEBHOOK_URL = "https://example.test/sms";
    db.$transaction.mockImplementation((callback) => callback(db));
    db.otpSession.findFirst.mockResolvedValue(null);
    db.otpSession.create.mockResolvedValue({ id: "failed-delivery" });
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Offline"));
    try {
      await expect(
        service.requestCustomerOtp({ phone: "9876543210" }),
      ).rejects.toThrow("OTP could not be delivered");
      expect(db.otpSession.delete).toHaveBeenCalledWith({
        where: { id: "failed-delivery" },
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
  it("limits repeated OTP requests before sending another message", async () => {
    process.env.OTP_WEBHOOK_URL = "https://example.test/sms";
    db.$transaction.mockImplementation((callback) => callback(db));
    db.otpSession.findFirst.mockResolvedValue({ id: "recent-request" });
    await expect(
      service.requestCustomerOtp({ phone: "9876543210" }),
    ).rejects.toThrow("Please wait");
    expect(db.otpSession.create).not.toHaveBeenCalled();
  });
});
