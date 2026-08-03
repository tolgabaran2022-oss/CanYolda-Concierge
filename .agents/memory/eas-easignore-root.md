---
name: EAS .easignore must live at git root
description: .easignore paths resolve from git root; placing it in a monorepo subdirectory silently does nothing for workspace-level node_modules
---

# EAS .easignore must live at git root

**Rule:** Place `.easignore` at the **workspace git root**, NOT alongside `eas.json` in the mobile artifact subdirectory.

**Why:** EAS archives from the git root. Paths in `.easignore` resolve relative to the git root regardless of where you run `eas build` from. A `.easignore` in `artifacts/mobile/` with `node_modules/` only excludes `artifacts/mobile/node_modules/` — the workspace-root `node_modules/` (pnpm virtual store, ~1GB) is unaffected and gets uploaded.

**How to apply:** When archive size is bloated (EAS warns "786 MB"), ensure `.easignore` is at the git root and excludes:
- `node_modules/`
- Non-mobile artifacts (`artifacts/api-server/`, etc.)
- `docs/`, `.agents/`, `.local/`
- Build outputs (`dist/`, `.expo/`, `*.tsbuildinfo`)

**Symptom of OOM:** EAS error `SERVER_ERROR: We've lost connection to the worker` immediately after `Daemon will be stopped at the end of the build` in RUN_GRADLEW phase — Gradle never ran any tasks, worker OOM'd during initialization.
