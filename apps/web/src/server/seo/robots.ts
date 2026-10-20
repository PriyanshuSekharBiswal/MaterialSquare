import type { IncomingMessage, ServerResponse } from "node:http";
import { canonicalSiteOrigin, trustedSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";

function getRequestOrigin(req: IncomingMessage) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
    req.headers.host;
  if (!host || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  return trustedSiteOrigin(`https://${host}`);
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" });
    res.end();
    return;
  }
  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) {
    const forwardedHost = req.headers["x-forwarded-host"];
    const host =
      (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
      req.headers.host;
    const validHost = Boolean(host && /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host));
    res.writeHead(validHost ? 503 : 400, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    });
    res.end(req.method === "HEAD" ? undefined : validHost ? "SEO configuration is unavailable" : "Invalid website host");
    return;
  }
  const origin = canonicalSiteOrigin(requestOrigin);
  const isPreview = isPreviewDeployment();
  const body = [
    "User-agent: *",
    ...(isPreview
      ? ["Allow: /", "Disallow: /api/"]
      : [
          "Allow: /",
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
