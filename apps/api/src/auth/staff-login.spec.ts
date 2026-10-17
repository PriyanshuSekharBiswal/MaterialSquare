import { StaffLoginSchema } from "@material-square/types";
import { AuthController } from "./auth.controller";
import { STAFF_COOKIE, STAFF_SESSION_TTL_MS } from "./staff-auth-cookie";
describe("staff sign-in validation", () => {
  it.each(["9876543210", "+91 98765 43210", "919876543210", "00919876543210", "09876543210"])("normalizes %s", phone => {
    expect(StaffLoginSchema.parse({ phone, password: "Valid-password-123" }).phone).toBe("9876543210");
  });
  it("returns a useful validation error without calling authentication", async () => {
    const auth = { loginStaff: jest.fn() };
    const controller = new AuthController(auth as any, {} as any);
    await expect(
      controller.loginStaff(
        { phone: "123", password: "Valid-password-123" },
        {} as any,
      ),
    ).rejects.toThrow("Enter a valid 10-digit Indian mobile number");
    expect(auth.loginStaff).not.toHaveBeenCalled();
  });
  it("passes a canonical phone to authentication and issues an HttpOnly cookie", async () => {
    const auth = {
      loginStaff: jest.fn().mockResolvedValue({
        accessToken: "signed-staff-jwt",
        user: { id: "staff-id", email: "staff@example.com", name: "Staff", role: "ADMIN" },
      }),
    };
    const response = { cookie: jest.fn(), setHeader: jest.fn() };
    const result = await new AuthController(auth as any, {} as any).loginStaff(
      { phone: "+91 9876543210", password: "Valid-password-123" },
      response as any,
    );
    expect(auth.loginStaff).toHaveBeenCalledWith({ phone: "9876543210", password: "Valid-password-123" });
    expect(result).toMatchObject({ ok: true, user: { id: "staff-id" } });
    expect(result).not.toHaveProperty("accessToken");
    expect(response.cookie).toHaveBeenCalledWith(
      STAFF_COOKIE,
      "signed-staff-jwt",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/api",
        maxAge: STAFF_SESSION_TTL_MS,
      }),
    );
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
});
