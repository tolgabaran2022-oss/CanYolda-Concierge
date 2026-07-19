---
name: i18n architecture
description: How the global i18n system is built — packages, init order, locale detection, language context, and pitfalls.
---

## Packages
- `i18next` + `react-i18next` — installed in `artifacts/mobile`
- **NO expo-localization** — v57 conflicts with Expo SDK 54 expected v17; downgrading to v17 leaves `_tmp/android` dirs that crash Metro's watcher. Removed entirely.

## File layout
```
artifacts/mobile/i18n/
  index.ts           — init, detectLanguage(), applyLanguage(), SUPPORTED_LANGUAGES, LangCode
  resources/tr.json  — Turkish (default/fallback)
  resources/en.json  — English
artifacts/mobile/contexts/LanguageContext.tsx — currentLanguage, changeLanguage, isLanguageReady
```

## Init order (critical)
`_layout.tsx` calls `initI18n()` (async) before fonts are loaded. Splash screen is kept visible until BOTH fonts AND i18n are ready. This prevents any flash of translation keys.

```ts
// _layout.tsx
const [i18nReady, setI18nReady] = useState(false);
useEffect(() => { initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true)); }, []);
if ((!fontsLoaded && !fontError) || !i18nReady) return null;
```

## Provider order
`I18nextProvider` wraps everything → `LanguageProvider` is inside `I18nextProvider` (needs it) → other providers inside `LanguageProvider`.

## Locale detection (no expo-localization)
```ts
// iOS:  NativeModules.SettingsManager.settings.AppleLocale
// Android: NativeModules.I18nManager.localeIdentifier
// Web: navigator.language
```
Falls back to "tr" on any error.

## Language persistence
AsyncStorage key: `@canyoldasi/language`

Priority: saved → device → "tr"

## Changing language
`applyLanguage(code)` → saves to AsyncStorage + calls `i18n.changeLanguage()`. Entire app re-renders immediately via react-i18next's context.

## Globe icon
`Globe` from lucide-react-native added to `components/Icon.tsx` ICON_MAP as `"globe"` / `"globe-outline"`.

**Why:** No expo-localization prevents Metro crashes; NativeModules approach is zero-dependency and always safe since we don't need rich locale data, just a 2-letter language code.
