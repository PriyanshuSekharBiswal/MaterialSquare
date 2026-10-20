import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CUSTOMER_SESSION_TTL_MS } from "./customer-session";

describe("customer OTP sign-in", () => {
  const customer = {
    id: "customer-qa",
    phone: "9876543210",
    name: "QA Customer",
    email: "customer@example.test",
    companyName: null,
    shippingAddress: "QA Site",
    city: "Noida",
    pincode: "201301",
  };

  function serviceFor(verifiedPhone = "9876543210") {
    const tx = {
      customer: { upsert: jest.fn().mockResolvedValue(customer) },
      customerSession: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn(async (work: (db: unknown) => Promise<unknown>) => work(tx)),
    };
    const msg91Widget = { verifyAccessToken: jest.fn().mockResolvedValue(verifiedPhone) };
    const service = new AuthService({ sign: jest.fn() } as never, prisma as never, msg91Widget as never);
    return { service, prisma, tx, msg91Widget };
  }

  it("creates a revocable 90-day browser session after provider verification", async () => {
    const { service, tx, msg91Widget } = serviceFor();
    const before = Date.now();
    const result = await service.verifyCustomerMsg91AccessToken({
      phone: "9876543210",
      accessToken: "verified-otp-token",
    });
    const session = tx.customerSession.create.mock.calls[0][0].data;

    expect(msg91Widget.verifyAccessToken).toHaveBeenCalledWith("verified-otp-token");
    expect(tx.customer.upsert).toHaveBeenCalledWith({
      where: { phone: "9876543210" },
      update: {},
      create: { phone: "9876543210", name: "", pincode: "" },
    });
    expect(session.customerId).toBe(customer.id);
    expect(session).not.toHaveProperty("passwordAuthenticated");
    expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(before + CUSTOMER_SESSION_TTL_MS - 100);
    expect(session.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + CUSTOMER_SESSION_TTL_MS + 100);
    expect(result.customer).toMatchObject({ id: customer.id, phone: customer.phone });
    expect(result.sessionToken).toEqual(expect.any(String));
  });

  it("does not create an account session if the verified phone differs from the requested number", async () => {
    const { service, tx } = serviceFor("9876543211");
    await expect(service.verifyCustomerMsg91AccessToken({
      phone: "9876543210",
      accessToken: "verified-otp-token",
    })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tx.customer.upsert).not.toHaveBeenCalled();
    expect(tx.customerSession.create).not.toHaveBeenCalled();
  });
});
