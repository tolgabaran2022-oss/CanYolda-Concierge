# CanYoldaşı — Release Readiness Report
**Tarih:** 20 Temmuz 2026  
**Auditor:** Replit Agent (statik analiz + API testleri)  
**Commit:** 6480f0f906a7a3b3184b7be15fee70b7752dedfa

---

## Nihai Karar

> **NOT READY**

P0 bloker: 1 · P1 kritik: 4 · P2 major: 5 · P3 minor: 3

---

## Özet Tablo

| Alan | Platform | Ortam/Cihaz | Senaryo | Sonuç | UI Kanıt | API Kanıt | DB Kanıt | Hata |
|---|---|---|---|---|---|---|---|---|
| TypeScript | Tüm | Replit dev | tsc --noEmit | **PASS** | — | — | — | — |
| Register | Web/API | Replit dev curl | Yeni kullanıcı kaydı | **PASS** | — | 200+JWT | — | — |
| Login | Web/API | Replit dev curl | Email+şifre | **PASS** | — | 200+JWT | — | — |
| Auth/me | Web/API | Replit dev curl | Token doğrulama | **PASS** | — | 200+user | — | — |
| Pet premium gate (BE) | Web/API | Replit dev curl | 2. hayvan ücretsiz kullanıcıya engel | **PASS** | — | PET_PREMIUM_REQUIRED | — | — |
| Unauthenticated pet DELETE | Web/API | Replit dev curl | Auth olmadan 401 | **PASS** | — | 401 | — | — |
| Unauthenticated adoption DELETE | Web/API | Replit dev curl | Auth olmadan 401 | **PASS** | — | 401 | — | — |
| Hesap silme (API) | Web/API | Replit dev | Route + şifre doğrulama | **STATIC REVIEW** | — | Kod doğru | — | — |
| Rate limiting | Web/API | Replit dev | Auth/upload/general | **STATIC REVIEW** | — | Kod doğru | — | — |
| Push bildirimi | iOS/Android | — | Token kaydı | **NOT TESTED** | — | expo-notifications yok | — | — |
| RC satın alma (iOS) | iOS | — | Apple Sandbox | **BLOCKED** | — | — | — | Fiziksel cihaz gerekli |
| RC satın alma (Android) | Android | — | Play License Tester | **BLOCKED** | — | — | — | Fiziksel cihaz gerekli |
| Restore purchases | iOS/Android | — | Mağaza geri yükleme | **BLOCKED** | — | — | — | Fiziksel cihaz gerekli |
| Kamera/galeri | iOS/Android | — | Fotoğraf çekme | **BLOCKED** | — | — | — | Fiziksel cihaz gerekli |
| Konum | iOS/Android | — | GPS izni | **BLOCKED** | — | — | — | Fiziksel cihaz gerekli |
| Sign in with Apple | iOS | — | Apple OAuth | **NOT TESTED** | — | Yok | — | Uygulanamaz (email/pass only) |
| Google ile giriş | Android/iOS | — | Google OAuth | **NOT TESTED** | — | Yok | — | Uygulanamaz (email/pass only) |
| iOS production build | iOS | — | EAS build | **BLOCKED** | — | — | — | Credentials gerekli |
| Android production AAB | Android | — | EAS build | **BLOCKED** | — | — | — | Credentials gerekli |
| Web production build | Web | — | Metro web | **NOT TESTED** | — | — | — | Build test edilmedi |
| Privacy policy erişim | Web | Expo web | Ekran | **STATIC REVIEW** | Ekran var | — | — | — |
| Terms of service | Web | Expo web | Ekran | **STATIC REVIEW** | Ekran var | — | — | — |
| i18n Türkçe | Tüm | — | Tab ekranları | **STATIC REVIEW** | Kısmi | — | — | Birçok ekran hardcoded TR |
| Hesap silme (UI) | Tüm | — | Ayarlar > Hesabı Sil | **STATIC REVIEW** | Kod var | — | — | — |

---

## P0 — RELEASE BLOCKER

| # | Alan | Açıklama | Etki |
|---|---|---|---|
| P0-01 | Push Notifications | `expo-notifications` paketi `package.json`'da yok, `app.json`'da plugin yok, Android `POST_NOTIFICATIONS` izni eksik. Uygulama aşı/randevu/mesaj/sahiplenme bildirimlerini doğru teslim edemez. | App Store/Play Store inceleme sırasında bildirim özelliği çalışmayacak |

---

## P1 — CRITICAL

| # | Alan | Açıklama |
|---|---|---|
| P1-01 | i18n Eksik | `add-adoption.tsx`, `add-animal.tsx`, `boost-packages.tsx`, `adoption/edit/[id].tsx`, `leaderboard.tsx` ve diğer birçok ekran hardcoded Türkçe. `useTranslation` yok. Uluslararasılaştırma incomplete. |
| P1-02 | iOS Fiziksel Cihaz Testi | Ana akış (kamera, konum, harita, gerçek Push, Sign-in) fiziksel iOS cihazda test edilmedi. Mağaza gönderiminden önce zorunlu. |
| P1-03 | Android Fiziksel Cihaz Testi | Yukarıdakiyle aynı — Android fiziksel cihaz testi eksik. |
| P1-04 | RC Sandbox Satın Alma Testi | Apple Sandbox ve Google Play License Tester ile gerçek IAP akışı test edilmedi. `pet_premium` entitlement aktivasyonu doğrulanmadı. |

---

## P2 — MAJOR

| # | Alan | Açıklama |
|---|---|---|
| P2-01 | FACEBOOK_APP_ env vars | Sunucuda `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` tanımlı; ancak Facebook OAuth görünür bir akış bulunamadı. Gereksizse kaldırılmalı. |
| P2-02 | Web Production Build | `npx expo export --platform web` production build çalıştırılıp doğrulanmadı. |
| P2-03 | Abonelik yönetim linki | Ayarlar ekranında aktif aboneliği yönetmek için App Store / Play Store'a yönlendiren bir bağlantı olmalı (App Store Review zorunluluğu). |
| P2-04 | Privacy Manifest (iOS 17+) | `PrivacyInfo.xcprivacy` eksikliği kontrol edilmedi. Expo SDK 54 genellikle bunu oluşturur, ancak doğrulanmadı. |
| P2-05 | Tablet UI | `supportsTablet: true` ayarlanmış; ancak iPad üzerinde responsive test yapılmadı. |

---

## P3 — MINOR

| # | Alan | Açıklama |
|---|---|---|
| P3-01 | Adaptive icon | `adaptiveIcon.foregroundImage` ana `icon.png` ile aynı. Ayrı foreground katmanı önerilir. |
| P3-02 | App Name | app.json'da `"name": "CanYoldasi"` (aksan yok); `CFBundleDisplayName` ve `android:label` doğru görünüyor. Mağaza listing adıyla eşleşmeli. |
| P3-03 | `__DEV__` console.log | `revenueCat.ts` içinde `__DEV__` korumalı console.log satırları mevcut. Production build'de çıkmaz, ancak log temizliği önerilir. |

---

## Platform Özeti

| Platform | Durum | Notlar |
|---|---|---|
| Web | CONDITIONALLY READY | Push bildirimi hariç API testleri geçiyor. Production build test edilmeli. |
| Android | NOT READY | P0 (push), P1 (fiziksel cihaz + RC testi) eksik |
| iOS | NOT READY | P0 (push), P1 (fiziksel cihaz + RC testi) eksik |
| App Store | NOT READY | Push, fiziksel test, RC sandbox, store metadata eksik |
| Google Play | NOT READY | Push, fiziksel test, RC sandbox, store metadata eksik |

---

## Gönderime Kalan İşler

1. `expo-notifications` kur, app.json'a plugin ekle, Android `POST_NOTIFICATIONS` izni ekle
2. Push token kayıt akışını uygula/doğrula
3. iOS fiziksel cihaz + TestFlight testi
4. Android fiziksel cihaz + Play Internal Test testi
5. RevenueCat Apple Sandbox + Google License Tester IAP testi
6. Web production build (`npx expo export --platform web`) doğrulama
7. App Store Connect ve Google Play Console metadata girişi
8. Store screenshots hazırlama
9. Abonelik yönetim linki ekleme (Ayarlar ekranı)
10. Facebook env var temizliği veya OAuth akışının tamamlanması

**Tahmini Süre (24 saat planı):** `reports/24_HOUR_RELEASE_PLAN.md` dosyasına bakınız.  
**Manuel Kullanıcı İşlemleri:** EAS credentials, App Store Connect girişi, Google Play Console girişi, fiziksel cihaz testi.
