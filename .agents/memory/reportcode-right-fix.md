---
name: reportCode RIGHT fix
description: Why SUBSTRING(col FROM $n) fails in Drizzle and how to fix report code generation
---

## The rule
Use `RIGHT(report_code, 6)` (not `SUBSTRING(report_code FROM $n)`) in Drizzle `sql` template literals to extract the sequence number from report codes.

**Why:** PostgreSQL has two overloaded forms of SUBSTRING:
- `SUBSTRING(text FROM int)` — positional extraction
- `SUBSTRING(text FROM text)` — POSIX regex extraction

When Drizzle parameterizes the integer via `${n}`, PostgreSQL cannot resolve the overload unambiguously and silently falls back to the regex form, returning wrong/null results. `RIGHT(col, 6)` has no overload ambiguity.

Also: COUNT(*)-based seq generation breaks after deletions. E.g. 12 records created, 7 deleted → COUNT=5, seq=6, but CY-2026-000006 already exists from before. Always use `MAX(CAST(RIGHT(report_code, 6) AS INTEGER)) + 1`.

**How to apply:** Any raw SQL in Drizzle that passes a positional integer to SUBSTRING must either use `sql.raw(String(n))` or switch to `RIGHT(col, n)` / `substr(col, start)`.
