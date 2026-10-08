// Keep customer accounts signed in across browser restarts. Sessions renew as
// customers use the account and remain revocable through explicit sign-out.
export const CUSTOMER_SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
export const CUSTOMER_SESSION_RENEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
