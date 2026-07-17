---
name: Metro watcher ENOENT fix
description: How to fix Metro crashing when it can't watch a directory that no longer exists
---

## Problem

Metro (React Native bundler) crashes with:
```
Error: ENOENT: no such file or directory, watch '/path/to/.local/skills/.old-xxx/references'
```

Metro's FallbackWatcher tries to watch all directories it knows about. If a directory is deleted after Metro cached it, it throws a fatal ENOENT on startup.

## Fix

```bash
mkdir -p "/path/to/the/missing/directory"
# then restart the workflow
```

**Why:** Creating the empty directory is enough to satisfy the watcher. Metro doesn't need any content there — it just needs the path to exist.

## How to apply

Any time the mobile Expo workflow crashes immediately at startup with an ENOENT watch error on a `.local/skills/` path (usually a stale skill directory), create the missing path and restart.
