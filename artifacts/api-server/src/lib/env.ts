/**
 * env.ts — Startup environment validation.
 * Called once in index.ts before any server logic.
 * Fails fast (throws) if critical secrets are missing or unsafe.
 */
import { logger } from "./logger.js";

interface EnvSpec {
  key: string;
  required: boolean;
  dangerousDefault?: string;
  description: string;
}

const SPECS: EnvSpec[] = [
  {
    key: "DATABASE_URL",
    required: true,
    description: "PostgreSQL connection string",
  },
  {
    key: "JWT_SECRET",
    required: true,
    dangerousDefault: "dev-secret-change-me",
    description: "JWT signing secret (≥32 characters)",
  },
  {
    key: "PORT",
    required: true,
    description: "HTTP server port",
  },
];

const OPTIONAL_WARNINGS: { key: string; description: string }[] = [
  { key: "REVENUECAT_WEBHOOK_AUTH_TOKEN", description: "RevenueCat webhook auth — webhook endpoint rejects all requests without this" },
  { key: "RESEND_API_KEY",                description: "Resend API key — password reset emails will fail without this" },
  { key: "PASSWORD_RESET_FROM_EMAIL",     description: "Sender address for password reset emails (e.g. 'CanYoldaşı <noreply@yourdomain.com>')" },
  { key: "PASSWORD_RESET_BASE_URL",       description: "Base URL for password reset links (e.g. 'https://canyoldasimapp.com/reset-password')" },
];

export function validateEnv(): void {
  const missing: string[] = [];
  const dangerous: string[] = [];

  for (const spec of SPECS) {
    const val = process.env[spec.key];

    if (!val) {
      if (spec.required) missing.push(`${spec.key} (${spec.description})`);
      continue;
    }

    if (spec.dangerousDefault && val === spec.dangerousDefault) {
      dangerous.push(`${spec.key} is using the dangerous default value "${spec.dangerousDefault}"`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] FATAL — Missing required environment variables:\n` +
      missing.map((m) => `  • ${m}`).join("\n") +
      `\nSet these in Replit Secrets before starting the server.`
    );
  }

  if (dangerous.length > 0) {
    throw new Error(
      `[env] FATAL — Dangerous default values detected:\n` +
      dangerous.map((d) => `  • ${d}`).join("\n") +
      `\nReplace with strong, randomly-generated secrets in Replit Secrets.`
    );
  }

  for (const { key, description } of OPTIONAL_WARNINGS) {
    if (!process.env[key]) {
      logger.warn(`[env] ${key} not set — ${description}`);
    }
  }

  logger.info("[env] Environment validation passed");
}
