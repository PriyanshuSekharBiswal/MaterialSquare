import { CustomerGuard } from "./customer.guard";
import {
  CUSTOMER_SESSION_RENEW_WINDOW_MS,
  CUSTOMER_SESSION_TTL_MS,
} from "./customer-session";

describe("CustomerGuard persistent sessions", () => {
  it("renews a returning customer's cookie and server session near expiry", async () => {
    const token = "a".repeat(64);
    const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_RENEW_WINDOW_MS / 2);
    const prisma = {
      customerSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: "hashed-session-id",
          customerId: "customer-id",
          expiresAt,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const response = { cookie: jest.fn() };
    const request = {
      method: "GET",
      headers: { cookie: `ms_customer_session=${token}` },
      get: jest.fn().mockReturnValue(undefined),
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    };

    await expect(
      new CustomerGuard(prisma as never).canActivate(context as never),
    ).resolves.toBe(true);

    expect(prisma.customerSession.update).toHaveBeenCalledWith({
      where: { id: "hashed-session-id" },
      data: { expiresAt: expect.any(Date) },
    });
    const renewedExpiry = prisma.customerSession.update.mock.calls[0][0].data
      .expiresAt as Date;
    expect(renewedExpiry.getTime()).toBeGreaterThan(
      Date.now() + CUSTOMER_SESSION_TTL_MS - 1000,
    );
    expect(response.cookie).toHaveBeenCalledWith(
      "ms_customer_session",
      token,
      expect.objectContaining({
        httpOnly: true,
        path: "/api",
        maxAge: CUSTOMER_SESSION_TTL_MS,
      }),
    );
  });
});
