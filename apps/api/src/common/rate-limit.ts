import { createHmac } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { PrismaService } from "../prisma/prisma.service";
import { StaffLoginSchema } from "@material-square/types";

const WINDOW_MS = 15 * 60 * 1000;
const AUTH_ENDPOINTS = new Set([
  "/api/auth/staff/login",
  "/api/auth/customer/otp/verify-msg91",
]);

export function publicRateLimit(prisma: PrismaService) {
  let cleanupAfter = 0;
  return (request: Request, response: Response, next: NextFunction) => {
    if (request.method !== "POST") return next();
    const normalizedPath = (request.path || "/").toLocaleLowerCase().replace(/\/+$/, "") || "/";
    const analyticsEvent = normalizedPath === "/api/analytics/events";
    if (
      !analyticsEvent &&
      !/^\/api\/(auth|rfqs|inquiries|customer\/rfqs)(\/|$)/.test(normalizedPath)
    )
      return next();
    const routeMatch = normalizedPath.match(
      /^\/api\/(auth|rfqs|inquiries|customer\/rfqs)(?:\/|$)/,
    );
    const routeGroup = analyticsEvent
      ? "/api/analytics/events"
      : AUTH_ENDPOINTS.has(normalizedPath)
        ? normalizedPath
        : routeMatch?.[1] === "auth"
          ? "/api/auth"
          : routeMatch
            ? `/api/${routeMatch[1]}`
            : normalizedPath;
    const isStaffLogin = normalizedPath === "/api/auth/staff/login";
    const parsedLogin = isStaffLogin ? StaffLoginSchema.safeParse(request.body) : null;
    const loginIdentifier = parsedLogin?.success
      ? parsedLogin.data.phone || parsedLogin.data.email || ""
      : "";
    const now = Date.now();
    const bucketStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
    const hmacKey = process.env.JWT_SECRET;
    if (!hmacKey) {
      response.status(503).json({ message: "Request protection is temporarily unavailable" });
      return;
    }
    const bucketKey = (scope: string, perIp = true) => createHmac("sha256", hmacKey)
      .update(`${perIp ? request.ip : "*"}:${scope}:${bucketStart}`)
      .digest("hex");
    const key = bucketKey(routeGroup);
    const identityKey = loginIdentifier
      ? bucketKey(`/api/auth/staff/login:${loginIdentifier}`, false)
      : null;
    const identityIpKey = loginIdentifier
      ? bucketKey(`/api/auth/staff/login:${loginIdentifier}`)
      : null;

    void (async () => {
      let recordCount = 0;
      let identityCount: number | null = null;
      let identityIpCount: number | null = null;
      try {
        const record = await prisma.apiRateLimitBucket.upsert({
          where: { key },
          create: {
            key,
            count: 1,
            expiresAt: new Date(bucketStart + WINDOW_MS),
          },
          update: { count: { increment: 1 } },
          select: { count: true },
        });
        recordCount = record.count;
        if (recordCount > (analyticsEvent ? 300 : 20)) {
          response
            .status(429)
            .json({ message: "Too many requests. Please try again later." });
          return;
        }
        const identityRecord = identityKey
          ? await prisma.apiRateLimitBucket.upsert({
              where: { key: identityKey },
              create: {
                key: identityKey,
                count: 1,
                expiresAt: new Date(bucketStart + WINDOW_MS),
              },
              update: { count: { increment: 1 } },
              select: { count: true },
            })
          : null;
        identityCount = identityRecord?.count ?? null;
        const identityIpRecord = identityIpKey
          ? await prisma.apiRateLimitBucket.upsert({
              where: { key: identityIpKey },
              create: {
                key: identityIpKey,
                count: 1,
                expiresAt: new Date(bucketStart + WINDOW_MS),
              },
              update: { count: { increment: 1 } },
              select: { count: true },
            })
          : null;
        identityIpCount = identityIpRecord?.count ?? null;
        if (now >= cleanupAfter) {
          cleanupAfter = now + 60_000;
          void prisma.apiRateLimitBucket
            .deleteMany({ where: { expiresAt: { lte: new Date(now) } } })
            .catch(() => undefined);
        }
      } catch {
        // Do not silently fall back to per-process limits in production: that
        // would make the protection disappear when the API scales out.
        response
          .status(503)
          .json({ message: "Request protection is temporarily unavailable" });
        return;
      }
      if (identityIpCount !== null && identityIpCount > 10) {
        response
          .status(429)
          .json({ message: "Too many requests. Please try again later." });
        return;
      }
      if (identityKey) {
        response.once("finish", () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            void prisma.apiRateLimitBucket
              .updateMany({
                where: { key: identityKey },
                data: { count: 0 },
              })
              .catch(() => undefined);
            if (identityIpKey)
              void prisma.apiRateLimitBucket
                .updateMany({
                  where: { key: identityIpKey },
                  data: { count: 0 },
                })
                .catch(() => undefined);
          }
        });
      }
      const identityDelayMs = identityCount === null
        ? 0
        : Math.min(5_000, Math.max(0, identityCount - 20) * 250);
      if (identityDelayMs > 0) {
        const delay = setTimeout(() => next(), identityDelayMs);
        response.once("close", () => clearTimeout(delay));
        return;
      }
      next();
    })().catch((cause: unknown) => next(cause));
  };
}
