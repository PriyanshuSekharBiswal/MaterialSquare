export const JWT_ISSUER = "material-square-api";
export const JWT_STAFF_AUDIENCE = "material-square-staff";

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32 || secret.startsWith("replace-with-"))
    throw new Error("JWT_SECRET must contain at least 32 bytes of random secret material");
  return secret;
}
