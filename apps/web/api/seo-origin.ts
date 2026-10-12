/** Keep production SEO URLs on the configured public host across domain aliases. */
export function canonicalSiteOrigin(requestOrigin: string) {
  const deploymentEnvironment = process.env.VERCEL_ENV;
  if (
    deploymentEnvironment === "preview" ||
    (deploymentEnvironment !== "production" && process.env.NODE_ENV !== "production")
  ) {
    return requestOrigin;
  }

  const configured =
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VITE_VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!configured) return requestOrigin;

  try {
    const url = new URL(
      configured.includes("://") ? configured : `https://${configured}`,
    );
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    ) {
      return url.origin;
    }
  } catch {
    // Fall back to the validated request origin if deployment configuration is
    // absent or malformed. Build-time metadata performs stricter validation.
  }
  return requestOrigin;
}
