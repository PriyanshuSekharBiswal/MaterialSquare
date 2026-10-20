import { createHmac } from "node:crypto";
import { jwtSecret } from "./jwt-config";

// Keep customer accounts signed in across browser restarts while bounding the
// idle lifetime of a stolen or abandoned session cookie.
export const CUSTOMER_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const CUSTOMER_SESSION_RENEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const CUSTOMER_SESSION_ROTATION_GRACE_MS = 15 * 60 * 1000;

// Derive a repeatable successor token from the old bearer token and persisted
// rotation timestamp. During the grace window the guard can reissue the same
// token if the original Set-Cookie response was lost, without racing a second
// rotation or storing a recoverable token in the database.
export function rotatedCustomerSessionToken(
  previousToken: string,
  previousId: string,
  rotatedAt: Date,
) {
  const key = createHmac("sha256", jwtSecret())
    .update("material-square/customer-session/rotation-key/v1")
    .digest();
  return createHmac("sha256", key)
    .update("material-square/customer-session/rotation-token/v1\0")
    .update(previousId)
    .update("\0")
    .update(String(rotatedAt.getTime()))
    .update("\0")
    .update(previousToken)
    .digest("hex");
}
