// Demo authentication is an explicit environment, never an automatic fallback.
export function demoAuthEnabled(): boolean {
  const enabled = process.env.DEMO_AUTH_ENABLED === "true";
  if (enabled && process.env.APP_ENV !== "demo")
    throw new Error("DEMO_AUTH_ENABLED requires APP_ENV=demo");
  return enabled;
}
