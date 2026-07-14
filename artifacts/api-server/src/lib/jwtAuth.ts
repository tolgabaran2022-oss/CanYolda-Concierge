import jwt from "jsonwebtoken";
import type { Request } from "express";

const JWT_SECRET =
  process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "dev-secret-change-me";

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
      const payload = jwt.verify(auth.slice(7), JWT_SECRET) as jwt.JwtPayload;
      if (typeof payload.sub === "string" && payload.sub) return payload.sub;
    } catch {
      return "";
    }
  }
  return "";
}
