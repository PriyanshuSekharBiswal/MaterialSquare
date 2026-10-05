import type { IncomingMessage, ServerResponse } from "node:http";

function getRequestOrigin(req: IncomingMessage) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
    req.headers.host;
  if (!host || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  return `https://${host}`;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
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
  const isPreview = process.env.VERCEL_ENV !== "production";
  const body = [
    "User-agent: *",
    ...(isPreview
      ? ["Disallow: /"]
      : [
          "Allow: /",
          "Disallow: /account",
          "Disallow: /api/",
          `Sitemap: ${origin}/sitemap.xml`,
        ]),
    "",
  ].join("\n");
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    ...(isPreview ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
  });
  res.end(req.method === "HEAD" ? undefined : body);
}
