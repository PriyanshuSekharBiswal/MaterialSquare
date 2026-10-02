export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith("replace-with-"))
    throw new Error("JWT_SECRET must contain at least 32 characters");
  return secret;
}
