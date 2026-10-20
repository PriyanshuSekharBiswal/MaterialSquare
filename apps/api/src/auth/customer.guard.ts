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
  CUSTOMER_SESSION_ROTATION_GRACE_MS,
  CUSTOMER_SESSION_TTL_MS,
  rotatedCustomerSessionToken,
} from "./customer-session";

export const CUSTOMER_COOKIE = "ms_customer_session";

function customerSessionToken(req: Request) {
  const value = req.headers.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${CUSTOMER_COOKIE}=`))
    ?.slice(CUSTOMER_COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export function customerSessionHash(req: Request) {
  const token = customerSessionToken(req);
  return token ? createHash("sha256").update(token).digest("hex") : null;
}

@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<Request & {
        customerId?: string;
        customerSessionId?: string;
      }>();
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
      const defaultDevOrigins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "https://material-square.localtest.me:5173",
        "https://material-square.localtest.me:5175",
      ];
      const defaultOrigins =
        process.env.NODE_ENV === "production" ? "" : defaultDevOrigins.join(",");
      const allowed = (process.env.CORS_ORIGINS || defaultOrigins)
        .split(",")
        .map((item) => item.trim());
      if (origin && !allowed.includes(origin))
        throw new ForbiddenException("Origin not permitted");
    }
    const sessionId = customerSessionHash(req);
    const presentedToken = customerSessionToken(req);
    const now = new Date();
    const session = sessionId
      ? await this.prisma.customerSession.findFirst({
          where: {
            OR: [
              { id: sessionId },
              {
                previousId: sessionId,
                previousValidUntil: { gt: now },
              },
            ],
          },
          select: {
            id: true,
            customerId: true,
            expiresAt: true,
            lastRotatedAt: true,
            previousId: true,
          },
        })
      : null;
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException("Please sign in to your account");
    const expected = req.get("X-Material-Account");
    if (expected && expected !== session.customerId)
      throw new ConflictException(
        "The signed-in account changed. Reload this page.",
      );
    const expiresAt = new Date(now.getTime() + CUSTOMER_SESSION_TTL_MS);
    const isLogout = req.path?.endsWith("/logout") ?? false;
    if (
      !isLogout &&
      session.previousId !== null &&
      session.previousId === sessionId &&
      presentedToken
    ) {
      res.cookie(
        CUSTOMER_COOKIE,
        rotatedCustomerSessionToken(
          presentedToken,
          session.previousId,
          session.lastRotatedAt,
        ),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/api",
          maxAge: CUSTOMER_SESSION_TTL_MS,
        },
      );
    } else if (
      !isLogout &&
      now.getTime() - session.lastRotatedAt.getTime() >=
        CUSTOMER_SESSION_RENEW_WINDOW_MS
    ) {
      const sessionToken = rotatedCustomerSessionToken(
        presentedToken!,
        session.id,
        now,
      );
      const rotated = await this.prisma.customerSession.updateMany({
        where: {
          id: session.id,
          lastRotatedAt: {
            lte: new Date(now.getTime() - CUSTOMER_SESSION_RENEW_WINDOW_MS),
          },
        },
        data: {
          id: createHash("sha256").update(sessionToken).digest("hex"),
          previousId: session.id,
          previousValidUntil: new Date(
            now.getTime() + CUSTOMER_SESSION_ROTATION_GRACE_MS,
          ),
          expiresAt,
          lastActivityAt: now,
          lastRotatedAt: now,
        },
      });
      if (rotated.count > 0)
        res.cookie(CUSTOMER_COOKIE, sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/api",
          maxAge: CUSTOMER_SESSION_TTL_MS,
        });
    } else if (!isLogout) {
      const touched = await this.prisma.customerSession.updateMany({
        where: {
          id: session.id,
          lastActivityAt: {
            lt: new Date(now.getTime() - 60 * 60 * 1000),
          },
        },
        data: { expiresAt, lastActivityAt: now },
      });
      if (touched.count > 0 && presentedToken)
        res.cookie(CUSTOMER_COOKIE, presentedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/api",
          maxAge: CUSTOMER_SESSION_TTL_MS,
        });
    }
    req.customerId = session.customerId;
    req.customerSessionId = session.id;
    return true;
  }
}
