import type { IncomingMessage, ServerResponse } from "node:http";
import blogIndex from "../src/server/seo/blog-index.js";
import blogPreview from "../src/server/seo/blog-preview.js";
import contactIndex from "../src/server/seo/contact-index.js";
import expertsIndex from "../src/server/seo/experts-index.js";
import homepageIndex from "../src/server/seo/homepage-index.js";
import locationPreview from "../src/server/seo/location-preview.js";
import marketplacePreview from "../src/server/seo/marketplace-preview.js";
import productPreview from "../src/server/seo/product-preview.js";
import robots from "../src/server/seo/robots.js";
import sitemap from "../src/server/seo/sitemap.js";
import sitePagePreview from "../src/server/seo/site-page-preview.js";

const handlers = {
  blog: blogPreview,
  "blog-index": blogIndex,
  contact: contactIndex,
  experts: expertsIndex,
  homepage: homepageIndex,
  location: locationPreview,
  marketplace: marketplacePreview,
  product: productPreview,
  robots,
  sitemap,
  "site-page": sitePagePreview,
} satisfies Record<string, (req: IncomingMessage, res: ServerResponse) => unknown>;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const incoming = new URL(req.url || "/", "https://internal.invalid");
  const route = incoming.searchParams.get("__route") || "";
  const routeHandler = handlers[route as keyof typeof handlers];
  if (!routeHandler) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : "Not found");
    return;
  }

  incoming.searchParams.delete("__route");
  req.url = `${incoming.pathname}${incoming.search}`;
  return routeHandler(req, res);
}
