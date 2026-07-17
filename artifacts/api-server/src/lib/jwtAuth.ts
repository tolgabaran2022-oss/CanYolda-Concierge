import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

/**
 * Return the JWT secret.
 * Throws if the secret is missing or using the insecure default.
 * env.ts validates this at boot; this is a secondary guard.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
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
 * Reads the `Authorization: Bearer <token>` header only (verified JWT).
 * Returns an empty string if the token is absent or invalid.
 * Callers must treat an empty string as unauthenticated.
 *
 * x-user-id headers are intentionally ignored and never accepted
 * as a source of identity.
 */
export function extractUserId(req: Request): string {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(
        auth.slice(7),
        getJwtSecret(),
        { algorithms: ["HS256"] },
      ) as jwt.JwtPayload;
      if (typeof payload.sub === "string" && payload.sub) return payload.sub;
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Express middleware — enforces JWT Bearer authentication.
 *
 * On success:                calls next()
 * Missing/malformed token:   401 { error: "Oturum gerekli." }
 * Expired token:             401 { error: "Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın." }
 *
 * x-user-id headers are completely ignored; identity comes only from
 * a verified JWT.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Oturum gerekli." });
    return;
  }
  try {
    const payload = jwt.verify(
      auth.slice(7),
      getJwtSecret(),
      { algorithms: ["HS256"] },
    ) as jwt.JwtPayload;
    if (typeof payload.sub !== "string" || !payload.sub) {
      res.status(401).json({ error: "Oturum gerekli." });
      return;
    }
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın." });
    } else {
      res.status(401).json({ error: "Oturum gerekli." });
    }
  }
}
