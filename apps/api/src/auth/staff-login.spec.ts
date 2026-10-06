import { StaffLoginSchema } from "@material-square/types";
import { AuthController } from "./auth.controller";
describe("staff sign-in validation", () => {
  it.each(["9876543210", "+91 98765 43210", "919876543210", "00919876543210", "09876543210"])("normalizes %s", phone => {
    expect(StaffLoginSchema.parse({ phone, password: "Valid-password-123" }).phone).toBe("9876543210");
  });
  it("returns a useful validation error without calling authentication", () => {
    const auth = { loginStaff: jest.fn() };
    const controller = new AuthController(auth as any);
    expect(() => controller.loginStaff({ phone: "123", password: "Valid-password-123" })).toThrow("Enter a valid 10-digit Indian mobile number");
    expect(auth.loginStaff).not.toHaveBeenCalled();
  });
  it("passes a canonical phone to authentication", () => {
    const auth = { loginStaff: jest.fn().mockReturnValue({ accessToken: "test" }) };
    new AuthController(auth as any).loginStaff({ phone: "+91 9876543210", password: "Valid-password-123" });
    expect(auth.loginStaff).toHaveBeenCalledWith({ phone: "9876543210", password: "Valid-password-123" });
  });
});
