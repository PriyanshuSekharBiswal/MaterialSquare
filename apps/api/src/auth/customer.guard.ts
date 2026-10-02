import { demoAuthEnabled } from "./demo-mode";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
export const CUSTOMER_COOKIE = "ms_customer_session";
export function checkCustomerMutation(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  if (
    req.get("X-Material-Square") !== "customer" ||
    !req.is("application/json")
  )
    throw new ForbiddenException("Invalid customer request");
  const origin = req.get("origin");
  const allowed = (
    process.env.CORS_ORIGINS ||
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173"
  )
    .split(",")
    .map((v) => v.trim());
  if (origin && !allowed.includes(origin))
    throw new ForbiddenException("Origin not permitted");
}
export function sessionHash(req: Request) {
  const value = req.headers.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(CUSTOMER_COOKIE + "="))
    ?.slice(CUSTOMER_COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value)
    ? createHash("sha256").update(value).digest("hex")
    : null;
}
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    checkCustomerMutation(req);
    const id = sessionHash(req);
    const session = id
      ? await this.prisma.customerSession.findUnique({
          where: { id },
          include: { customer: { select: { isDemo: true } } },
        })
      : null;
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.customer.isDemo !== demoAuthEnabled()
    )
      throw new UnauthorizedException("Please sign in to your account");
    const expectedAccount = req.get("X-Material-Account");
    if (expectedAccount && expectedAccount !== session.customerId)
      throw new ConflictException(
        "The signed-in account changed in another tab. Reload before making changes.",
      );
    req.customerId = session.customerId;
    return true;
  }
}
