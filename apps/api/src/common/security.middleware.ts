import type { Request, Response, NextFunction } from "express";

/**
 * Security headers and sanitization middleware for all incoming API requests.
 */
export function securityHeadersMiddleware() {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Strip X-Powered-By header
    res.removeHeader("X-Powered-By");

    // Enforce nosniff for MIME-type sniffing protection
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Prevent framing / clickjacking
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // Control referrer data leakage
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Restrict unnecessary browser feature capabilities
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    // API responses can contain account, staff, or business data. Avoid
    // relying on each controller to remember cache-control headers.
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Pragma", "no-cache");

    next();
  };
}

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/** Reject cross-origin browser mutations, including simple form submissions. */
export function trustedOriginMiddleware(origins: string[]) {
  const allowedOrigins = new Set(origins);

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get("origin");
    if (
      safeMethods.has(req.method.toUpperCase()) ||
      !origin ||
      allowedOrigins.has(origin)
    ) {
      return next();
    }

    return res.status(403).json({ message: "Request origin is not allowed" });
  };
}
