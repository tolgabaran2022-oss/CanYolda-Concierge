# CanYoldaşı

Türkiye'deki sokak hayvanlarını raporlamak, takip etmek ve sahiplendirme ilanları yönetmek için topluluk odaklı mobil uygulama.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo dev server
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, expo-router, React Native 0.81
- Backend: Express + PostgreSQL (Drizzle ORM) — API server on port 8080
- Maps: react-native-maps@1.18.0 (pinned — only version compatible with Expo Go)
- Location: expo-location
- Images: expo-image-picker, expo-image
- UI: @expo/vector-icons, expo-linear-gradient, expo-blur, expo-haptics
- Auth: JWT-based auth (login/register via `/api/auth/*`, token stored in AsyncStorage)

## Where things live

- `artifacts/mobile/app/` — all screens (expo-router file-based routing)
- `artifacts/mobile/contexts/` — AuthContext, AnimalsContext, PetsContext, AdoptionContext
- `artifacts/mobile/components/` — AnimalCard, PetCard, AdoptionCard, StatusBadge, EmptyState
- `artifacts/mobile/constants/colors.ts` — warm palette tokens
- `artifacts/mobile/hooks/useColors.ts` — color hook
- `artifacts/mobile/stubs/react-native-maps.web.js` — web polyfill for react-native-maps
- `artifacts/mobile/metro.config.js` — metro resolver override for web

## Architecture decisions

- **Full backend** — PostgreSQL via Drizzle ORM; all features persist server-side and sync across devices
- **react-native-maps web stub** — react-native-maps@1.18.0 crashes on web due to codegenNativeCommands; a metro resolver override maps the module to a CJS stub on the `web` platform
- **NativeTabs + liquid glass** — uses `isLiquidGlassAvailable()` for iOS 26+ liquid glass tab bars with classic BlurView fallback
- **JWT auth** — email/password stored in PostgreSQL, JWT token in AsyncStorage; profile synced to social_profiles on login
- **Context providers stacked** — Auth > Animals > Pets > Adoption > QueryClient > GestureHandler
- **Schema migrations** — drizzle-kit push requires a TTY; use executeSql via code_execution tool for non-interactive schema changes

## Product

- Interactive map showing stray animals in Istanbul with colored markers (status: aç/yaralı/sağlıklı/bilinmiyor)
- CRUD for stray animal reports (add photo, set status, pin location, leave comments, mark as fed)
- Pet profile management for owned pets (name, type, age, vaccination info, feeding notes)
- Adoption listings board with contact info
- Full auth flow (register / login / logout) with profile page and stats

## User preferences

_Populate as you build._

## Gotchas

- **react-native-maps must stay at exactly 1.18.0** — other versions crash in Expo Go
- **Never add react-native-maps to `plugins` in app.json** — it will crash the app
- **Web bundler** — react-native-maps needs the metro stub (see `stubs/`) or web bundling fails
- Seed data for animals and adoption listings populates automatically on first launch (AsyncStorage key absent = seed)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.agents/memory/rn-maps-web-stub.md` for the react-native-maps web fix details
