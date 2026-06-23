---
name: Stripe boost packages direct query
description: syncBackfill() doesn't reliably populate stripe.products in dev; query packages via Stripe API directly
---

In the CanYoldaşı project, `stripe-replit-sync`'s `syncBackfill()` completes almost instantly (< 1ms after server listen) and doesn't actually populate `stripe.products` with the seeded products. The root cause is unclear (possibly the managed webhook secret mismatch or timing), but the practical effect is `stripe.products` stays empty.

**Why this matters:** `getBoostPackages()` originally queried `stripe.products` JOIN `stripe.prices`. With the table empty, the packages endpoint always returned `[]`.

**How to apply:** For a small, rarely-changing product catalog (like 2 boost packages), query the Stripe API directly in `storage.getBoostPackages()`:

```typescript
const stripe = await getUncachableStripeClient();
const products = await stripe.products.search({
  query: "metadata['boost_type']:'featured_listing' AND active:'true'",
});
```

This is reliable in both dev and prod. The `stripe.checkout_sessions`, `stripe.customers`, etc. tables (written via webhooks) can still be used for transactional data — just don't rely on `syncBackfill` for the catalog.
