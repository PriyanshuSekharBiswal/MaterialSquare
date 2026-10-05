const isProductionRuntime = () =>
  process.env.NODE_ENV === "production";

function validHttpsUrl(value: string | undefined, allowPath = false) {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (allowPath || url.pathname === "/");
  } catch {
    return false;
  }
}

/** Required third-party settings for a production V1 launch. Never returns secret values. */
export function productionReadinessGaps(): string[] {
  if (!isProductionRuntime()) return [];

  const gaps: string[] = [];
  const origins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length || origins.some((origin) => !validHttpsUrl(origin)))
    gaps.push("CORS_ORIGINS");
  const storageConfigured = Boolean(
    process.env.AWS_S3_BUCKET?.trim() &&
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
    process.env.AWS_SECRET_ACCESS_KEY?.trim() &&
    validHttpsUrl(process.env.AWS_S3_PUBLIC_URL, true) &&
    (!process.env.AWS_S3_ENDPOINT || validHttpsUrl(process.env.AWS_S3_ENDPOINT)),
  );
  if (!storageConfigured) gaps.push("S3-compatible product-image storage");

  return gaps;
}
