---
name: RevenueCat IAP Boost System
description: RC IAP setup for "İlanı Öne Çıkar" — project/app IDs, connector proxy usage, and architecture decisions
---

## Project & App IDs
- Project ID: `projbd415e06`
- Test Store app: `app0dc598e87a`
- iOS app (App Store): `app17b84626f1`
- Android app (Play Store): `app6ebf8e51f6`
- Entitlement: `entledb38bbdbf` (lookup_key: `listing_boost`)
- Offering: `ofrngcb4883ab84` (lookup_key: `listing_boost_offering`)
- Packages: `pkge8f889692d2` (boost_1_day), `pkged1cb067c93` (boost_3_days), `pkge526c6ef769` (boost_7_days)

## Product IDs
- `canyoldasi_boost_1_day` — test: prod8c9322023a, iOS: prod55e2186777, Android: prod888151425f
- `canyoldasi_boost_3_days` — test: prod100bf9bfd8, iOS: prod3d72e8f202, Android: proda537411423
- `canyoldasi_boost_7_days` — test: prodfe56efa3d5, iOS: prod480198c3c4, Android: prodc5742ed56f

## RC Connector Proxy
- Use `ReplitConnectors.proxy("revenuecat", path)` — NOT listConnections (returns empty).
- `/v2/projects` works. `/v2/projects/{pid}/apps/{id}/api_keys` returns 404 (not in proxy whitelist).
- Entitlement/package product attach endpoints also 404 via proxy — must do manually in RC dashboard.
- RC v2 subscription duration: only `P1W`, `P1M`, `P2M`, `P3M`, `P6M`, `P1Y` (no `P1D`).
- iOS/Android products use type `consumable` (not `non_subscription`).

## Architecture
- `BoostContext.tsx` uses hardcoded `RC_PACKAGES` constants (no API roundtrip for package list).
- `boost-packages.tsx` calls `Purchases.purchasePackage()` then POSTs to `/api/boost/verify-iap`.
- `/api/boost/verify-iap` — JWT-authenticated; creates active `listing_promotions` record immediately.
- `listing_promotions` table extended with: `store_transaction_id`, `platform`, `verified_at`.
- RC SDK initialized in `_layout.tsx` with dynamic import + try/catch (safe for Expo Go / web).
- `AuthContext` now exposes `token: string | null` in context (needed by BoostContext purchaseBoost).
- `adoption.tsx` MyListingCard `onBoost` now simple `() => void` — routes to `boost-packages.tsx`.

## Env Vars Needed (must set in Replit Secrets)
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` — from RC dashboard App > API Keys
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` — from RC dashboard
- (Optional) `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` — for sandbox testing

**Why:** RC API key endpoints are not accessible via Replit connector proxy; keys must be copied from the RevenueCat dashboard manually.
