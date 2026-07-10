---
name: Animals & Adoption backend migration
description: How stray animal reports and adoption listings moved from AsyncStorage to PostgreSQL; schema and route details; migration gotchas
---

## What was done
AnimalsContext, PetsContext, and AdoptionContext were migrated from AsyncStorage-only to real PostgreSQL backend via the API server.

## DB tables added (lib/db/src/schema/animals.ts)
- `stray_animals` — core animal report (image_url, animal_type, lat/lon, status, notes, fed_count, needs_help_count, comments_count)
- `animal_interactions` — fed/needs_help toggles with UNIQUE(animal_id, user_id, type)
- `animal_comments` — comments linked to stray_animals with CASCADE delete
- `adoption_listings` — adoption posts (pet_name, pet_type, photo_url, allow_phone_contact, etc.)

## petProfiles columns added
`age TEXT`, `vaccination_info TEXT`, `feeding_notes TEXT` — added to map the mobile Pet model fields.

## API routes
- `/api/animals` — GET list, POST create, PATCH update, DELETE; /fed and /needs-help toggle endpoints; /comments CRUD
- `/api/adoption` — GET list, GET /my, POST create, PATCH update, DELETE; GET /:id increments view count

## Migration gotcha
`drizzle-kit push` / `push-force` fails in non-TTY shells (CI, piped commands). Use `executeSql` via the code_execution tool to run raw SQL `CREATE TABLE IF NOT EXISTS` statements directly instead.

**Why:** drizzle-kit push detects new tables and prompts for confirmation interactively; this blocks in non-TTY shells.
**How to apply:** Any future schema additions should be done via `executeSql` raw SQL in code_execution, NOT via `pnpm --filter @workspace/db run push`.

## Context shape changes
All three contexts now expose `isLoading: boolean`, `error: string | null`, and `refresh: () => Promise<void>` in addition to the original API. Existing screens are backward-compatible (empty array during load).
