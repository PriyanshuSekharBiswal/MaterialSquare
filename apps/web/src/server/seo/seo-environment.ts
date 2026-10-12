/** Determine whether crawler-visible routes belong to a non-production deploy. */
export function isPreviewDeployment() {
  const deploymentEnvironment =
    process.env.VERCEL_ENV?.trim() || process.env.VITE_VERCEL_ENV?.trim();
  return deploymentEnvironment
    ? deploymentEnvironment !== "production"
    : process.env.NODE_ENV !== "production";
}
