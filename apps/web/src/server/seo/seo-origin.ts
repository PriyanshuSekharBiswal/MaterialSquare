function httpsOrigin(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(
      value.includes("://") ? value.trim() : `https://${value.trim()}`,
    );
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    )
      return url.origin;
  } catch {
    // Invalid deployment values are ignored; production handlers fail closed.
  }
  return null;
}

/** Resolve only deployment-owned hosts in production and Vercel previews. */
export function trustedSiteOrigin(requestOrigin: string) {
  const deploymentEnvironment = process.env.VERCEL_ENV?.trim();
  if (deploymentEnvironment === "preview") {
    return httpsOrigin(process.env.VERCEL_URL);
  }

  const isProduction =
    deploymentEnvironment === "production" ||
    process.env.NODE_ENV === "production";
  if (!isProduction) return requestOrigin;

  const configuredOrigins = [
    process.env.PUBLIC_SITE_URL,
    process.env.VITE_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VITE_VERCEL_PROJECT_PRODUCTION_URL,
  ];
  for (const configured of configuredOrigins) {
    if (!configured?.trim()) continue;
    return httpsOrigin(configured);
  }

  return null;
}

/** Keep SEO URLs on the same trusted host used to fetch the deployed shell. */
export function canonicalSiteOrigin(requestOrigin: string) {
  const trusted = trustedSiteOrigin(requestOrigin);
  if (trusted) return trusted;

  const deploymentEnvironment = process.env.VERCEL_ENV?.trim();
  if (
    deploymentEnvironment === "preview" ||
    deploymentEnvironment === "production" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("A trusted public site origin is required for SEO URLs");
  return requestOrigin;
}
