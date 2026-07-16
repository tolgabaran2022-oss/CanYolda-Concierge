import jwt from "jsonwebtoken";
import type { Request } from "express";

/**
 * Return the JWT secret.
 * Throws if the secret is missing or using the insecure default.
 * env.ts validates this at boot; this is a secondary guard.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("[jwtAuth] JWT_SECRET environment variable is required but not set");
  }
  if (secret === "dev-secret-change-me") {
    throw new Error("[jwtAuth] JWT_SECRET must not use the default development value — set a strong secret in Replit Secrets");
  }
  return secret;
}

/**
 * Extract and verify the authenticated user ID from a request.
 *
 * Prefers the `Authorization: Bearer <token>` header (verified JWT).
 * Returns an empty string if the token is absent or invalid — callers
 * must treat an empty string as unauthenticated.
 */
export function extractUserId(req: Request): string {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(auth.slice(7), getJwtSecret()) as jwt.JwtPayload;
      if (typeof payload.sub === "string" && payload.sub) return payload.sub;
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Extract authenticated user ID from a request.
 * Tries Bearer JWT first; falls back to the legacy `x-user-id` header
 * so older mobile code continues to work during the Bearer migration.
 * Returns empty string when neither is present.
 */
export function extractUserIdDual(req: Request): string {
  const jwtId = extractUserId(req);
  if (jwtId) return jwtId;
  const headerId = req.headers["x-user-id"];
  return (typeof headerId === "string" ? headerId : "") ?? "";
}
