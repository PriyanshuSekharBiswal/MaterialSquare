import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";

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
    if (!req.method || !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (
        req.get("X-Material-Square") !== "customer" ||
        !req.is("application/json")
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
          select: { customerId: true, expiresAt: true },
        })
      : null;
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException("Please sign in to your account");
    const expected = req.get("X-Material-Account");
    if (expected && expected !== session.customerId)
      throw new ConflictException(
        "The signed-in account changed. Reload this page.",
      );
    req.customerId = session.customerId;
    return true;
  }
}
