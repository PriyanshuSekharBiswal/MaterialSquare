-- Track authenticated activity and token rotation for idle expiry.
ALTER TABLE "customer_sessions"
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing session activity cannot be reconstructed. Grandfather currently
-- valid sessions from migration time, but never extend their former expiry.
UPDATE "customer_sessions"
SET "lastActivityAt" = CURRENT_TIMESTAMP,
    "lastRotatedAt" = "createdAt",
    "expiresAt" = LEAST("expiresAt", CURRENT_TIMESTAMP + INTERVAL '90 days');
