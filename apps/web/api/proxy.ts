import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { IncomingMessage, ServerResponse } from "node:http";

const hopByHop = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host",
]);
const methods = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const previewApiOrigin = "https://material-square-demo-api.onrender.com";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const configuredOrigin = process.env.API_ORIGIN?.trim() ||
    (process.env.VERCEL_ENV === "preview" ? previewApiOrigin : "");
  if (!configuredOrigin) {
    res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ message: "API is not configured" }));
    return;
  }
  if (!methods.has(req.method || "")) {
    res.writeHead(405, { Allow: [...methods].join(", "), "Cache-Control": "no-store" });
    res.end();
    return;
  }

  let destination: URL;
  try {
    const origin = new URL(configuredOrigin);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash)
      throw new Error("API_ORIGIN must be an HTTPS origin without credentials or a path");
    const incoming = new URL(req.url || "/", "http://localhost");
    const path = incoming.searchParams.get("path");
    if (!path || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === ".."))
      throw new Error("API route is invalid");
    incoming.searchParams.delete("path");
    destination = new URL(`/api/${path}${incoming.searchParams.size ? `?${incoming.searchParams}` : ""}`, origin);
  } catch {
    res.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ message: "API route configuration is invalid" }));
    return;
  }

  const headers = Object.fromEntries(
    Object.entries(req.headers).filter(([name, value]) => value !== undefined && !hopByHop.has(name.toLowerCase())),
  );
  headers.host = destination.host;
  const upstream = httpsRequest(destination, { method: req.method, headers }, (response) => {
    const responseHeaders = Object.fromEntries(
      Object.entries(response.headers).filter(([name, value]) => value !== undefined && !hopByHop.has(name.toLowerCase())),
    );
    responseHeaders["cache-control"] = "no-store";
    res.writeHead(response.statusCode || 502, responseHeaders);
    response.pipe(res);
  });
  upstream.setTimeout(59_000, () => upstream.destroy(new Error("API request timed out")));
  upstream.on("error", () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ message: "API is temporarily unavailable" }));
  });
  req.pipe(upstream);
}
