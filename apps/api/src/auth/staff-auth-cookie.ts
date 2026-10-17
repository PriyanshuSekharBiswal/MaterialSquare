import type { Request } from "express";

export const STAFF_COOKIE = "ms_staff_session";
export const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function staffSessionCookie(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0 || entry.slice(0, separator).trim() !== STAFF_COOKIE) {
      continue;
    }
    const value = entry.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value) || null;
    } catch {
      return null;
    }
  }

  return null;
}
