---
name: Stripe connector field names
description: Replit Stripe connector settings object field names differ from the official stripe-replit-sync code template
---

The Replit Stripe integration connector returns settings with these field names:

```json
{
  "account_id": "acct_...",
  "secret": "sk_test_...",
  "publishable": "pk_test_...",
  "mcp": "ek_test_...",
  "claim_url": "https://dashboard.stripe.com/claim_sandbox/..."
}
```

**The official code template in `.local/skills/stripe/references/code-templates.md` checks for `settings?.secret_key` — this is WRONG.** The actual field is `settings.secret`.

There is also NO `webhook_secret` field in settings — the webhook secret is managed internally by `stripe-replit-sync` via `findOrCreateManagedWebhook`.

**Why:** The template was written expecting a different field schema than what the Replit connector API actually returns. This causes the credential check to always fail with "missing secret key" even when Stripe is properly connected.

**How to apply:** In any `stripeClient.ts`, check for `settings?.secret` (not `settings?.secret_key`) and use `settings.secret` as the `secretKey`.
