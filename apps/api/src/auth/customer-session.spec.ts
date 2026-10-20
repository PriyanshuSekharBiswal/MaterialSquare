import { createHash } from "node:crypto";
import { CustomerGuard } from "./customer.guard";
import {
  CUSTOMER_SESSION_RENEW_WINDOW_MS,
  CUSTOMER_SESSION_TTL_MS,
} from "./customer-session";

describe("CustomerGuard persistent sessions", () => {
  it("extends idle expiry and rotates a returning customer's token", async () => {
    const token = "a".repeat(64);
    const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_TTL_MS / 2);
    const lastRotatedAt = new Date(Date.now() - CUSTOMER_SESSION_RENEW_WINDOW_MS * 2);
    const prisma = {
      customerSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: "hashed-session-id",
          customerId: "customer-id",
          expiresAt,
          lastRotatedAt,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const response = { cookie: jest.fn() };
    const request = {
      method: "GET",
      path: "/api/customer/activity",
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

    expect(prisma.customerSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "hashed-session-id",
        lastRotatedAt: {
          lte: expect.any(Date),
        },
      },
      data: {
        id: expect.stringMatching(/^[a-f0-9]{64}$/),
        previousId: "hashed-session-id",
        previousValidUntil: expect.any(Date),
        lastActivityAt: expect.any(Date),
        lastRotatedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      },
    });
    const renewal = prisma.customerSession.updateMany.mock.calls[0][0].data;
    const renewedExpiry = renewal
      .expiresAt as Date;
    expect(renewedExpiry.getTime()).toBeGreaterThan(
      Date.now() + CUSTOMER_SESSION_TTL_MS - 1000,
    );
    const renewedToken = response.cookie.mock.calls[0][1] as string;
    expect(renewedToken).not.toBe(token);
    expect(createHash("sha256").update(renewedToken).digest("hex")).toBe(renewal.id);
    expect(response.cookie).toHaveBeenCalledWith(
      "ms_customer_session",
      renewedToken,
      expect.objectContaining({
        httpOnly: true,
        path: "/api",
        maxAge: CUSTOMER_SESSION_TTL_MS,
      }),
    );
  });
});
