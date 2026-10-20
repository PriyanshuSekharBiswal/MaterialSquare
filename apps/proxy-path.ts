export class InvalidApiProxyPathError extends Error {}

export function parseApiProxyPath(requestUrl: string) {
  let incoming: URL;
  try {
    incoming = new URL(requestUrl, "http://localhost");
  } catch {
    throw new InvalidApiProxyPathError("API route is invalid");
  }
  const path = incoming.searchParams.get("path");
  let decodedPath = path || "";
  for (let pass = 0; pass < 3; pass += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decodedPath);
    } catch {
      throw new InvalidApiProxyPathError("API route is invalid");
    }
    if (next === decodedPath) break;
    decodedPath = next;
  }
  if (
    !path ||
    path.startsWith("/") ||
    /%25/i.test(path) ||
    /[\\?#]/.test(decodedPath) ||
    decodedPath.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new InvalidApiProxyPathError("API route is invalid");
  incoming.searchParams.delete("path");
  return {
    path,
    query: incoming.searchParams.toString(),
  };
}
