---
name: Android icon rendering — SVG migration
description: @expo/vector-icons font-based icons render as □ on Android in this pnpm workspace; full migration to lucide-react-native + react-native-svg
---

## Rule
Never use @expo/vector-icons (Ionicons, Feather, etc.) for UI icons in this project. All icons must go through `components/Icon.tsx` which renders via lucide-react-native SVG components.

**Why:** @expo/vector-icons relies on TTF font files loaded at runtime. In this pnpm monorepo, the font loading via `useFonts` / `Font.loadAsync` results in the JS cache marking fonts as "loaded" while the native Android typeface registration is incomplete or fails silently. This causes PUA Unicode characters to render as □ (tofu) on Android.

**How to apply:**
- Import `{ Icon }` from `@/components/Icon` for all icon rendering
- `Icon` accepts `name: string` (any known Ionicons/Feather name OR logical name), `size`, `color`, `strokeWidth`, `style`
- `components/AppIcon.tsx` wraps `Icon` with a typed `AppIconName` union — use for strongly-typed icon usage
- Tab bar in `app/(tabs)/_layout.tsx` imports Lucide components directly (Map, House, PawPrint, Heart, User)
- `components/Icon.tsx` contains the full mapping of all Ionicons/Feather string names → Lucide SVG components
- `app/_layout.tsx` only loads Inter fonts via `useFonts` — NO icon font loading needed

## Packages
- `lucide-react-native@1.24.0` — SVG icon components
- `react-native-svg@15.12.1` — native SVG renderer (installed via `expo install react-native-svg`)

## What NOT to do
- Do NOT add `...Ionicons.font` or `...Feather.font` to `useFonts` or `Font.loadAsync`
- Do NOT import `Ionicons`, `Feather`, or any other @expo/vector-icons component in screens/components
- Do NOT use `keyof typeof Ionicons.glyphMap` as a type annotation — use `string` instead
