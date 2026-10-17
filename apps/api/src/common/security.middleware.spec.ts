import type { Request, Response, NextFunction } from "express";
import {
  securityHeadersMiddleware,
  trustedOriginMiddleware,
} from "./security.middleware";

function makeResponse() {
  const response = {
    headers: new Map<string, string>(),
    removeHeader: jest.fn(),
    setHeader(name: string, value: string) {
      this.headers.set(name, value);
      return this;
    },
    status: jest.fn(function (this: unknown) {
      return this;
    }),
    json: jest.fn(),
  };
  return response as unknown as Response & {
    headers: Map<string, string>;
  };
}

describe("security middleware", () => {
  it("sets defensive and non-cacheable API response headers", () => {
    const middleware = securityHeadersMiddleware();
    const request = { path: "/api/admin/staff" } as Request;
    const response = makeResponse();
    const next = jest.fn();

    middleware(request, response, next);

    expect(response.removeHeader).toHaveBeenCalledWith("X-Powered-By");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allows configured origins and requests without a browser origin", () => {
    const middleware = trustedOriginMiddleware(["https://admin.example.com"]);
    const next = jest.fn();
    const response = makeResponse();

    middleware(
      { method: "POST", get: () => "https://admin.example.com" } as unknown as Request,
      response,
      next,
    );
    middleware(
      { method: "POST", get: () => undefined } as unknown as Request,
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.status).not.toHaveBeenCalled();
  });

  it("blocks cross-origin mutations but permits safe reads", () => {
    const middleware = trustedOriginMiddleware(["https://admin.example.com"]);
    const next = jest.fn();
    const response = makeResponse();

    middleware(
      { method: "POST", get: () => "https://attacker.example" } as unknown as Request,
      response,
      next,
    );
    middleware(
      { method: "GET", get: () => "https://attacker.example" } as unknown as Request,
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      message: "Request origin is not allowed",
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
