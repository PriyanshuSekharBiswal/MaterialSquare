import type { Request, Response, NextFunction } from "express";
export function publicRateLimit() {
  const windows = new Map<string, { count: number; until: number }>();
  return (request: Request, response: Response, next: NextFunction) => {
    if (request.method !== "POST") return next();
    const analyticsEvent = request.path === "/api/analytics/events";
    if (!analyticsEvent && !/^\/api\/(auth|rfqs|inquiries)(\/|$)/.test(request.path)) return next();
    const now = Date.now();
    for (const [key, value] of windows)
      if (value.until <= now) windows.delete(key);
    const key = `${request.ip}:${request.path}`;
    if (!windows.has(key) && windows.size >= 10000)
      return response.status(429).json({ message: "Please try again later" });
    const record = windows.get(key) || { count: 0, until: now + 15 * 60000 };
    record.count++;
    windows.set(key, record);
    if (record.count > (analyticsEvent ? 300 : 20))
      return response
        .status(429)
        .json({ message: "Too many requests. Please try again later." });
    next();
  };
}
