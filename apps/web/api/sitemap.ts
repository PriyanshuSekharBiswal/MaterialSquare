import type { IncomingMessage, ServerResponse } from "node:http";

function getRequestOrigin(req: IncomingMessage) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
    req.headers.host;
  if (!host || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = (
    Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol
  )
    ?.split(",")[0]
    ?.trim();
  const scheme =
    protocol === "http" && process.env.VERCEL_ENV !== "production"
      ? "http"
      : "https";
  return `${scheme}://${host}`;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" });
    res.end();
    return;
  }

  const origin = getRequestOrigin(req);
  if (!origin) {
    res.writeHead(400, {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex",
    });
    res.end(req.method === "HEAD" ? undefined : "Invalid website host");
    return;
  }

  const configuredApiOrigin = process.env.API_ORIGIN?.trim() || "";
  let apiOrigin: URL;
  try {
    apiOrigin = new URL(configuredApiOrigin);
    if (
      apiOrigin.protocol !== "https:" ||
      apiOrigin.username ||
      apiOrigin.password ||
      apiOrigin.pathname !== "/" ||
      apiOrigin.search ||
      apiOrigin.hash
    )
      throw new Error("Invalid API origin");
  } catch {
    res.writeHead(503, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : "Sitemap is not configured");
    return;
  }

  try {
    const response = await fetch(
      new URL(
        `/api/site-content/sitemap.xml?origin=${encodeURIComponent(origin)}`,
        apiOrigin,
      ),
      {
        headers: { Accept: "application/xml" },
      },
    );
    const body = await response.text();
    res.writeHead(response.status, {
      "Content-Type":
        response.headers.get("content-type") ||
        "application/xml; charset=utf-8",
      "Cache-Control": response.ok
        ? "public, max-age=300, s-maxage=300, stale-while-revalidate=600"
        : "no-store",
      ...(process.env.VERCEL_ENV !== "production"
        ? { "X-Robots-Tag": "noindex, nofollow" }
        : {}),
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(502, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(
      req.method === "HEAD" ? undefined : "Sitemap is temporarily unavailable",
    );
  }
}
