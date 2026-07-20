# CanYoldaşı — Test Matrix
**Tarih:** 20 Temmuz 2026

Sonuç sınıfları: **PASS** | **FAIL** | **STATIC REVIEW** | **BLOCKED** | **NOT TESTED**

---

## Bölüm 0 — Ortam Envanteri

| Bileşen | Değer |
|---|---|
| Expo SDK | ~54.0.27 |
| React Native | 0.81.5 |
| expo-router | ~6.0.17 |
| react-native-purchases | ^10.4.2 |
| react-native-maps | 1.18.0 (sabit) |
| iOS Bundle ID | com.canyoldasi.app |
| iOS Build Number | 1 |
| Android Package | com.canyoldasi.app |
| Android versionCode | 1 |
| App Version | 1.0.0 |
| EAS Profiller | development, preview, production |
| Auth Yöntemi | JWT (email/password) |
| Harita Sağlayıcısı | react-native-maps (Google/Apple native) |
| E-posta | Resend (`RESEND_API_KEY`) |
| Push Bildirim | **EKSİK** (expo-notifications kurulmamış) |
| Supabase | **YOK** (kendi PostgreSQL + Drizzle ORM) |
| RevenueCat Offering (pet) | canyoldasi_pet_premium |
| RevenueCat Offering (boost) | canyoldasi_boost |
| RC Entitlement | pet_premium |
| RC Paketler | $rc_monthly, $rc_annual |

---

## Bölüm 1 — Build ve Statik Kalite

| Test | Sonuç | Notlar |
|---|---|---|
| TypeScript `tsc --noEmit` | **PASS** | 0 hata |
| ESLint | **NOT TESTED** | Çalıştırılmadı |
| expo-doctor | **BLOCKED** | TTY gerektirir, timeout aldı |
| Duplicate dependency | **STATIC REVIEW** | Belirgin duplicate yok |
| Native module web uyumu | **STATIC REVIEW** | react-native-maps web stub doğru |
| Web bundle (expo export) | **NOT TESTED** | Çalıştırılmadı |
| Android AAB | **BLOCKED** | EAS credentials gerekli |
| iOS IPA | **BLOCKED** | EAS credentials + Apple cert gerekli |
| console.log server | **PASS** | Hiç yok (req.log / logger kullanılıyor) |

---

## Bölüm 2 — Production Config Audit

### iOS

| Madde | Durum | Not |
|---|---|---|
| Bundle identifier | **PASS** | com.canyoldasi.app |
| CFBundleDisplayName | **PASS** | CanYoldaşı |
| buildNumber | **PASS** | "1" |
| App icon | **PASS** | assets/images/icon.png mevcut |
| Splash screen | **PASS** | expo-splash-screen plugin var |
| Tablet desteği | **STATIC REVIEW** | supportsTablet: true; iPad testi yapılmadı |
| Kamera açıklaması | **PASS** | NSCameraUsageDescription var |
| Galeri açıklaması | **PASS** | NSPhotoLibraryUsageDescription var |
| Konum açıklaması | **PASS** | NSLocationWhenInUseUsageDescription var |
| Push entitlement | **PASS** | aps-environment: production |
| Şifreleme beyanı | **PASS** | ITSAppUsesNonExemptEncryption: false |
| URL scheme | **PASS** | com.canyoldasi.app |
| Sign in with Apple | **N/A** | Uygulamada kullanılmıyor |
| Privacy manifest | **NOT TESTED** | Expo SDK 54 otomatik üretir, doğrulanmadı |

### Android

| Madde | Durum | Not |
|---|---|---|
| Package name | **PASS** | com.canyoldasi.app |
| versionCode | **PASS** | 1 |
| Adaptive icon | **STATIC REVIEW** | foreground = ana icon (ayrı katman önerilir) |
| Kamera izni | **PASS** | CAMERA var |
| Konum izinleri | **PASS** | FINE + COARSE var |
| VIBRATE | **PASS** | var |
| RECORD_AUDIO | **PASS** | blockedPermissions'da |
| POST_NOTIFICATIONS | **FAIL** | Android 13+ için gerekli, eksik |
| Billing izni | **NOT TESTED** | RevenueCat otomatik eklediği doğrulanmadı |
| Play App Signing | **BLOCKED** | EAS build yapılmadı |
| BUILD_TYPE | **STATIC REVIEW** | eas.json'da app-bundle ✓ |

### Web

| Madde | Durum | Not |
|---|---|---|
| Production API URL | **STATIC REVIEW** | EXPO_PUBLIC_DOMAIN ile doğru yapılandırılmış |
| localhost guard | **PASS** | Dev fallback, EXPO_PUBLIC_DOMAIN korumalı |
| Web bundler | **PASS** | metro (app.json'da) |
| react-native-maps stub | **PASS** | metro.config.js resolver override |

---

## Bölüm 3 — Authentication

| Test | Web/API | iOS | Android |
|---|---|---|---|
| Email/şifre kaydı | **PASS** (curl) | **BLOCKED** | **BLOCKED** |
| Form validasyonu | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Duplicate e-posta | **STATIC REVIEW** (409 kodu var) | **BLOCKED** | **BLOCKED** |
| Geçersiz e-posta | **STATIC REVIEW** (Zod regex) | **BLOCKED** | **BLOCKED** |
| Şifre min 6 char | **STATIC REVIEW** (Zod min) | **BLOCKED** | **BLOCKED** |
| Telefon zorunlu (Turkish GSM) | **PASS** (Zod regex: ^5[0-9]{9}$) | **BLOCKED** | **BLOCKED** |
| Email/şifre girişi | **PASS** (curl) | **BLOCKED** | **BLOCKED** |
| Yanlış şifre | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Çıkış | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Session restore | **STATIC REVIEW** (AsyncStorage JWT) | **BLOCKED** | **BLOCKED** |
| JWT süresi | **STATIC REVIEW** (30 gün) | **BLOCKED** | **BLOCKED** |
| Şifremi unuttum | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Reset e-postası | **STATIC REVIEW** (Resend) | **BLOCKED** | **BLOCKED** |
| Deep link reset | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Hesap silme | **STATIC REVIEW** (şifre onaylı) | **BLOCKED** | **BLOCKED** |
| Google OAuth | **N/A** (yok) | **N/A** | **N/A** |
| Apple OAuth | **N/A** (yok) | **N/A** | **N/A** |

---

## Bölüm 5 — Evcilim Tam Akış

| Test | Web/API | iOS | Android |
|---|---|---|---|
| İlk hayvan ekleme (ücretsiz) | **PASS** (curl: 200) | **BLOCKED** | **BLOCKED** |
| İkinci hayvan (ücretsiz → gate) | **PASS** (curl: PET_PREMIUM_REQUIRED) | **BLOCKED** | **BLOCKED** |
| İkinci hayvan (premium → geçer) | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Hayvan fotoğrafı yükleme | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Premium modal gösterimi | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Doğrudan /evcilim/add bypass | **PASS** (BE: PET_PREMIUM_REQUIRED) | **BLOCKED** | **BLOCKED** |
| Belgeler (premium gate) | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| İlaçlar (premium gate) | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| AI Asistan (premium gate) | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |

---

## Bölüm 6 — RevenueCat & Satın Alma

| Test | Web | iOS | Android |
|---|---|---|---|
| Offering ID: canyoldasi_pet_premium | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| offerings.all değil current | **STATIC REVIEW** (kod doğru) | **BLOCKED** | **BLOCKED** |
| $rc_monthly, $rc_annual filtreleme | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Yıllık varsayılan seçim | **STATIC REVIEW** (exact "$rc_annual" match) | **BLOCKED** | **BLOCKED** |
| pet_premium entitlement | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Backend isPremium: true | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Restore purchases | Web: bilgi mesajı | **BLOCKED** | **BLOCKED** |
| Boost sistemi etkilenmedi | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| RC Test Store key production'da yok | **STATIC REVIEW** (env var korumalı) | **BLOCKED** | **BLOCKED** |

---

## Bölüm 7 — Sahiplendirme Akışı

| Test | Web/API | iOS | Android |
|---|---|---|---|
| İlan oluşturma | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Başkasının ilanını silme girişimi | **PASS** (403 Yetki yok) | **BLOCKED** | **BLOCKED** |
| İlan detayı görünürlük | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |

---

## Bölüm 8 — Harita & Sokak Hayvanları

| Test | Web/API | iOS | Android |
|---|---|---|---|
| Harita yükleme | **STATIC REVIEW** (stub/native split) | **BLOCKED** | **BLOCKED** |
| Konum izni | **BLOCKED** (native) | **BLOCKED** | **BLOCKED** |
| Hayvan raporu ekleme | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Başkasının raporunu değiştirme | **PASS** (403 Yetki yok) | **BLOCKED** | **BLOCKED** |

---

## Bölüm 9 — Mesajlaşma

| Test | Web/API | iOS | Android |
|---|---|---|---|
| Konuşma oluşturma | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Yetkisiz konuşma erişimi | **STATIC REVIEW** (auth middleware var) | **BLOCKED** | **BLOCKED** |
| Feed route artık yok | **PASS** (routes/social.ts incelendi, feed yok) | — | — |

---

## Bölüm 10 — Profil & Ayarlar

| Test | Web/API | iOS | Android |
|---|---|---|---|
| Profil görüntüleme | **STATIC REVIEW** | **BLOCKED** | **BLOCKED** |
| Hesap silme UI | **STATIC REVIEW** (account.tsx'te modal var) | **BLOCKED** | **BLOCKED** |
| Hesap silme API | **STATIC REVIEW** (şifre doğrulama zorunlu) | **BLOCKED** | **BLOCKED** |
| Abonelik yönetim linki | **FAIL** | **FAIL** | **FAIL** |
| Privacy policy ekranı | **STATIC REVIEW** (ekran mevcut) | **BLOCKED** | **BLOCKED** |
| Terms of service ekranı | **STATIC REVIEW** (ekran mevcut) | **BLOCKED** | **BLOCKED** |

---

## Bölüm 13 — Güvenlik

| Test | Sonuç | Notlar |
|---|---|---|
| x-user-id header bypass | **PASS** | jwtAuth.ts'de açıkça reddediliyor |
| Unauthenticated pet DELETE | **PASS** | 401 |
| Unauthenticated adoption DELETE | **PASS** | 401 |
| Pet ownership enforcement | **PASS** | ownerId !== userId → 403 |
| Adoption ownership enforcement | **PASS** | userId !== userId → 403 |
| Animal report ownership | **PASS** | 403 korumalı |
| Premium bypass (2. hayvan) | **PASS** | PET_PREMIUM_REQUIRED |
| Rate limiting | **PASS** (static) | Auth:10/15m, upload:20/1m, general:300/1m |
| Şifre hash (bcrypt) | **STATIC REVIEW** | bcrypt.compare kullanıyor |
| JWT secret | **STATIC REVIEW** | Env var (JWT_SECRET) |
| Server secret leak | **PASS** | REVENUECAT_SECRET_API_KEY server-only |
| SQL injection | **STATIC REVIEW** | Drizzle ORM parametrik sorgular |
| Webhook idempotency | **STATIC REVIEW** | revenuecat_webhook_events tablosu var |
