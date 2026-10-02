// Demo authentication is an explicit environment, never an automatic fallback.
export function demoAuthEnabled(): boolean {
  const enabled = process.env.DEMO_AUTH_ENABLED === "true";
  if (enabled && process.env.APP_ENV !== "demo")
    throw new Error("DEMO_AUTH_ENABLED requires APP_ENV=demo");
  return enabled;
}
export function demoPhones(): string[] {
  return (
    process.env.DEMO_CUSTOMER_PHONES || "9000000001,9000000002,9000000003"
  )
    .split(",")
    .map((v) => v.trim())
    .filter((v) => /^[6-9]\d{9}$/.test(v));
}
