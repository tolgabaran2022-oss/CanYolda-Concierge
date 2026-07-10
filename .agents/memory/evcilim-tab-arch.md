---
name: Evcilim dual-tab architecture
description: How the Evcilim/Sahiplendirme outer tab system works in pets.tsx and where all pet management screens live
---

## Structure
- `pets.tsx` has two outer tabs: "evcilim" | "adoption" (`MainTab` type)
- `OuterTabSwitcher` component renders the pill switcher; sits above `TabSwitcher` (3-segment adoption tabs)
- When mainTab === "evcilim" → `<EvcilimTab botPad={botPad} />`
- When mainTab === "adoption" → existing create/mylistings/listings tabs

## DB Tables (created via executeSql)
- `pet_vaccinations`, `pet_appointments`, `pet_identification`, `pet_notes`, `pet_nutrition`
- `pet_profiles` extended with: is_neutered, temperament, allergies, special_notes, height_cm, adoption_date, estimated_age_months
- Schema in: `lib/db/src/schema/petManagement.ts` (exported via `lib/db/src/schema/index.ts`)

## API Routes
- `/api/pets/:petId/vaccinations` — GET/POST/PATCH/DELETE
- `/api/pets/:petId/appointments` — GET/POST/PATCH/DELETE
- `/api/pets/:petId/identification` — GET/PUT (upsert)
- `/api/pets/:petId/notes` — GET/POST/PATCH/DELETE
- `/api/pets/:petId/nutrition` — GET/PUT (upsert)
- Router: `artifacts/api-server/src/routes/petManagement.ts`
- Uses `x-user-id` header for auth (no Bearer token)

## Mobile Screens
- `artifacts/mobile/components/EvcilimTab.tsx` — main Evcilim dashboard (pet selector, profile card, quick stats, grid, reminders)
- `artifacts/mobile/lib/petManagementApi.ts` — all types + fetch functions + buildReminders()
- `artifacts/mobile/app/evcilim/add.tsx` — add new pet
- `artifacts/mobile/app/evcilim/[petId].tsx` — pet detail + edit
- `artifacts/mobile/app/evcilim/[petId]/vaccinations.tsx`
- `artifacts/mobile/app/evcilim/[petId]/appointments.tsx`
- `artifacts/mobile/app/evcilim/[petId]/identification.tsx`
- `artifacts/mobile/app/evcilim/[petId]/notes.tsx`
- `artifacts/mobile/app/evcilim/[petId]/nutrition.tsx`

## Critical: lib rebuild required
After adding new exports to lib/db schema, run `pnpm run typecheck:libs` BEFORE running api-server typecheck, otherwise "Module '@workspace/db' has no exported member" errors appear.

**Why:** lib/db is a composite package that must emit declarations before consumers can see new exports. The api-server typecheck resolves against compiled .d.ts files, not source.
