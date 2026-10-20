const isProductionRuntime = () =>
  process.env.NODE_ENV === "production";

export function isCanonicalHttpsUrl(value: string | undefined, allowPath = false) {
  if (!value?.trim()) return false;
  try {
    const trimmed = value.trim();
    const url = new URL(trimmed);
    const canonicalUrl = `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;
    return url.protocol === "https:" &&
      (canonicalUrl === trimmed ||
        (allowPath && url.pathname === "/" && `${url.origin}/` === trimmed)) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (allowPath || url.pathname === "/");
  } catch {
    return false;
  }
}

export function isSafeBearerToken(value: string | undefined): value is string {
  const token = value?.trim();
  return Boolean(token && Buffer.byteLength(token, "utf8") >= 32 && /^[A-Za-z0-9\-._~+/]+=*$/.test(token));
}

/** Required third-party settings for a production V1 launch. Never returns secret values. */
export function productionReadinessGaps(): string[] {
  if (!isProductionRuntime()) return [];

  const gaps: string[] = [];
  const origins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length || origins.some((origin) => !isCanonicalHttpsUrl(origin)))
    gaps.push("CORS_ORIGINS");
  const storageConfigured = Boolean(
    process.env.AWS_S3_BUCKET?.trim() &&
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
    process.env.AWS_SECRET_ACCESS_KEY?.trim() &&
    isCanonicalHttpsUrl(process.env.AWS_S3_PUBLIC_URL, true) &&
    (!process.env.AWS_S3_ENDPOINT || isCanonicalHttpsUrl(process.env.AWS_S3_ENDPOINT)),
  );
  if (!storageConfigured) gaps.push("S3-compatible product-image storage");
  if (process.env.NOTIFICATION_WEBHOOK_URL?.trim()) {
    if (!isCanonicalHttpsUrl(process.env.NOTIFICATION_WEBHOOK_URL, true))
      gaps.push("HTTPS NOTIFICATION_WEBHOOK_URL");
    if (!isSafeBearerToken(process.env.NOTIFICATION_WEBHOOK_TOKEN))
      gaps.push("NOTIFICATION_WEBHOOK_TOKEN (at least 32 header-safe characters)");
  }

  if (process.env.NOTIFICATION_WEBHOOK_URL?.trim()) {
    if (!isCanonicalHttpsUrl(process.env.NOTIFICATION_WEBHOOK_URL, true))
      gaps.push("HTTPS NOTIFICATION_WEBHOOK_URL");
    if (!isSafeBearerToken(process.env.NOTIFICATION_WEBHOOK_TOKEN))
      gaps.push("NOTIFICATION_WEBHOOK_TOKEN (at least 32 header-safe characters)");
  }

  return gaps;
}
