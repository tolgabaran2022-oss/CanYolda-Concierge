import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

interface StripeCredentials {
  secretKey: string;
  webhookSecret?: string;
}

async function getStripeCredentials(): Promise<StripeCredentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Missing Replit environment variables. Ensure the Stripe integration is connected via the Integrations tab."
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`
    );
  }

  const data = (await resp.json()) as Record<string, unknown>;
  const items = data.items as Array<Record<string, unknown>> | undefined;
  const settings = items?.[0]?.settings as Record<string, string> | undefined;

  if (!settings?.secret_key) {
    throw new Error(
      "Stripe integration not connected or missing secret key. Connect Stripe via the Integrations tab first."
    );
  }

  return {
    secretKey: settings.secret_key,
    webhookSecret: settings.webhook_secret,
  };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeClientAndSecret(): Promise<{
  stripe: Stripe;
  webhookSecret: string | undefined;
}> {
  const { secretKey, webhookSecret } = await getStripeCredentials();
  return { stripe: new Stripe(secretKey), webhookSecret };
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret,
  });
}
