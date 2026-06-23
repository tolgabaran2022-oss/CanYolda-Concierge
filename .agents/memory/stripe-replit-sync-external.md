---
name: stripe-replit-sync esbuild external
description: stripe-replit-sync must be excluded from esbuild bundling or its migration SQL files won't be found at runtime
---

`stripe-replit-sync` uses `path.resolve(__dirname, "./migrations")` to locate its bundled SQL migration files. When esbuild bundles this package into the API server's `dist/index.mjs`, `__dirname` resolves to `dist/` (the output dir), not to the package's own location in `node_modules`.

This causes `runMigrations()` to silently skip all migrations (the migrations directory is not found), so the `stripe.*` tables are never created — manifesting as `relation "stripe.accounts" does not exist` errors at startup.

**Why:** esbuild inlines the package code and `__dirname` ends up pointing to the bundled output file's directory, not the source package's directory.

**How to apply:** Add both `stripe-replit-sync` and `stripe` to the `external` array in `build.mjs`:

```js
external: [
  "*.node",
  "stripe-replit-sync",
  "stripe",
  // ...rest
]
```

This keeps them as `node_modules` references at runtime, so their internal `__dirname` paths resolve correctly.
