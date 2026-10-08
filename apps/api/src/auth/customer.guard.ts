import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import {
  CUSTOMER_SESSION_RENEW_WINDOW_MS,
  CUSTOMER_SESSION_TTL_MS,
} from "./customer-session";

export const CUSTOMER_COOKIE = "ms_customer_session";

export function customerSessionHash(req: Request) {
  const value = req.headers.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${CUSTOMER_COOKIE}=`))
    ?.slice(CUSTOMER_COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value)
    ? createHash("sha256").update(value).digest("hex")
    : null;
}

@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<Request & { customerId?: string }>();
    const res = context.switchToHttp().getResponse<Response>();
    if (!req.method || !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const multipartRfq =
        req.method === "POST" &&
        req.path.endsWith("/rfqs") &&
        req.is("multipart/form-data");
      if (
        req.get("X-Material-Square") !== "customer" ||
        (!req.is("application/json") && !multipartRfq)
      )
        throw new ForbiddenException("Invalid customer request");
      const origin = req.get("origin");
      const allowed = (process.env.CORS_ORIGINS || "http://localhost:5173")
        .split(",")
        .map((item) => item.trim());
      if (origin && !allowed.includes(origin))
        throw new ForbiddenException("Origin not permitted");
    }
    const sessionId = customerSessionHash(req);
    const session = sessionId
      ? await this.prisma.customerSession.findUnique({
          where: { id: sessionId },
          select: { id: true, customerId: true, expiresAt: true },
        })
      : null;
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException("Please sign in to your account");
    const expected = req.get("X-Material-Account");
    if (expected && expected !== session.customerId)
      throw new ConflictException(
        "The signed-in account changed. Reload this page.",
      );
    if (
      session.expiresAt.getTime() - Date.now() <=
      CUSTOMER_SESSION_RENEW_WINDOW_MS
    ) {
      const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_TTL_MS);
      await this.prisma.customerSession.update({
        where: { id: session.id },
        data: { expiresAt },
      });
      const cookie = req.headers.cookie
        ?.split(";")
        .map((value) => value.trim())
        .find((value) => value.startsWith(`${CUSTOMER_COOKIE}=`))
        ?.slice(CUSTOMER_COOKIE.length + 1);
      if (cookie)
        res.cookie(CUSTOMER_COOKIE, cookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/api",
          maxAge: CUSTOMER_SESSION_TTL_MS,
        });
    }
    req.customerId = session.customerId;
    return true;
  }
}
