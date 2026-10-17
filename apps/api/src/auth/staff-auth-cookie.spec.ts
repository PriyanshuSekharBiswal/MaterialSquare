import type { Request } from "express";
import { STAFF_COOKIE, STAFF_SESSION_TTL_MS, staffSessionCookie } from "./staff-auth-cookie";

describe("staff session cookie", () => {
  it("extracts only the configured cookie from a request", () => {
    const token = "header.payload.signature";
    const request = {
      headers: { cookie: `other=ignored; ${STAFF_COOKIE}=${token}; tail=value` },
    } as Request;

    expect(staffSessionCookie(request)).toBe(token);
  });

  it("decodes cookie values and ignores malformed cookie data", () => {
    expect(
      staffSessionCookie({
        headers: { cookie: `${STAFF_COOKIE}=header%2Epayload%2Esignature` },
      } as Request),
    ).toBe("header.payload.signature");
    expect(
      staffSessionCookie({
        headers: { cookie: `${STAFF_COOKIE}=%E0%A4%A` },
      } as Request),
    ).toBeNull();
    expect(staffSessionCookie({ headers: {} } as Request)).toBeNull();
  });

  it("matches the staff JWT lifetime", () => {
    expect(STAFF_SESSION_TTL_MS).toBe(12 * 60 * 60 * 1000);
  });
});
