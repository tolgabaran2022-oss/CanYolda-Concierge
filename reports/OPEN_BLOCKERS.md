# CanYoldaşı — Open Blockers
**Tarih:** 20 Temmuz 2026

---

## P0 — RELEASE BLOCKER (1 adet)

### P0-01 · Push Notifications Altyapısı Eksik

**Durum:** OPEN  
**Etkilenen Platformlar:** iOS, Android  
**Tespit:** Static code analysis — `artifacts/mobile/package.json` ve `app.json` incelendi

**Bulgular:**
- `expo-notifications` paketi `package.json`'da bulunamadı
- `app.json` plugins listesinde `expo-notifications` yok
- Android `permissions` listesinde `android.permission.POST_NOTIFICATIONS` yok (Android 13+)
- `contexts/AuthContext.tsx` ve `notifications.tsx` push token registration kodu barındırmıyor
- `aps-environment: production` entitlement var ama Expo push altyapısı kurulmamış

**Risk:** Aşı hatırlatıcısı, randevu hatırlatıcısı, ilaç hatırlatıcısı, mesaj bildirimi ve sahiplenme talebi bildirimi teslim edilemez. App Store ve Google Play incelemesi sırasında bildirim özelliği bozuk görünür.

**Düzeltme Adımları:**
```bash
pnpm --filter @workspace/mobile add expo-notifications
```

`app.json` plugins dizisine ekle:
```json
["expo-notifications", {
  "icon": "./assets/images/icon.png",
  "color": "#7C45D9",
  "sounds": []
}]
```

Android permissions dizisine ekle:
```json
"android.permission.POST_NOTIFICATIONS"
```

Push token kaydını `AuthContext.tsx` içinde `useEffect` ile uygula (kullanıcı giriş yaptıktan sonra).

---

## P1 — CRITICAL (4 adet)

### P1-01 · i18n Eksik Ekranlar

**Durum:** OPEN  
**Etkilenen Platformlar:** iOS, Android, Web  
**Tespit:** Static analysis — `useTranslation` kullanımı arandı

**Etkilenen dosyalar (hardcoded Türkçe):**
- `app/add-adoption.tsx`
- `app/add-animal.tsx`
- `app/add-pet.tsx`
- `app/adoption/edit/[id].tsx`
- `app/boost-packages.tsx`
- `app/leaderboard.tsx`
- `app/animal/[id].tsx`
- `app/help-update/[animalId].tsx`
- `app/profile-edit.tsx`
- `app/evcilim-premium.tsx`

**Düzeltme:** Her ekrana `const { t } = useTranslation()` ekle ve string değerleri `i18n/tr.json` + `i18n/en.json`'a taşı.

---

### P1-02 · iOS Fiziksel Cihaz Testi Eksik

**Durum:** OPEN  
**Etkilenen Platform:** iOS  
**Tespit:** Test ortamı kısıtlaması

**Zorunlu testler (fiziksel cihaz):**
- Kamera izni + fotoğraf çekme
- Konum izni + harita
- Push notification alımı
- react-native-maps gerçek tile yükleme
- expo-haptics
- Tab bar liquid glass (iOS 26+)

**Düzeltme:** TestFlight build üret, iPhone üzerinde test et.

---

### P1-03 · Android Fiziksel Cihaz Testi Eksik

**Durum:** OPEN  
**Etkilenen Platform:** Android  
**Tespit:** Test ortamı kısıtlaması

**Zorunlu testler:**
- lucide-react-native ikonları gerçek Android cihazda
- Kamera + galeri (READ_MEDIA_IMAGES Android 13+)
- Back gesture navigation
- Push notification (FCM)
- Google Maps tile yükleme

**Düzeltme:** Play Internal Test track'e AAB yükle, Android cihazda test et.

---

### P1-04 · RevenueCat Sandbox IAP Testi Eksik

**Durum:** OPEN  
**Etkilenen Platform:** iOS, Android  
**Tespit:** Fiziksel cihaz + store credentials gerekli

**Zorunlu doğrulamalar:**
- `canyoldasi_pet_premium` offering'i Apple Sandbox'ta yükleniyor mu?
- `$rc_monthly` ve `$rc_annual` paketleri gözüküyor mu?
- Satın alma sonrası `pet_premium` entitlement aktifleşiyor mu?
- Backend `isPremium: true` dönüyor mu?
- Restore purchases çalışıyor mu?
- `canyoldasi_boost` offering'i etkilenmiyor mu?

**Düzeltme:** TestFlight/Internal Test build + Apple Sandbox hesabı / Google License Tester ile test et.

---

## P2 — MAJOR (5 adet)

### P2-01 · FACEBOOK_APP_ID / FACEBOOK_APP_SECRET Kullanılmayan Env Vars

**Durum:** OPEN  
**Tespit:** `grep process.env artifacts/api-server/src/` — var ama route bulunamadı

Aktif Facebook OAuth akışı yoksa bu değerleri env'den kaldır. Varsa, akış belgelen ve test edilmeli.

---

### P2-02 · Web Production Build Test Edilmedi

**Durum:** OPEN  
**Düzeltme:**
```bash
cd artifacts/mobile && npx expo export --platform web
```
Çıktıyı doğrula: bundle boyutu, hata yokluğu, react-native-maps web stub'ının çalışması.

---

### P2-03 · Abonelik Yönetim Linki Eksik

**Durum:** OPEN  
**Gerekçe:** App Store Review Guideline 3.1.2 — abonelik uygulamaları kullanıcıyı mağaza abonelik yönetimine yönlendirmelidir.

**Düzeltme:** `app/(tabs)/account.tsx` içinde Premium bölümüne:
```ts
// iOS
Linking.openURL("https://apps.apple.com/account/subscriptions")
// Android
Linking.openURL("https://play.google.com/store/account/subscriptions")
```

---

### P2-04 · Privacy Manifest (iOS 17+) Doğrulanmadı

**Durum:** OPEN  
**Tespit:** Expo SDK 54 otomatik oluşturabilir, ancak `PrivacyInfo.xcprivacy` varlığı + içeriği `eas build` çıktısında doğrulanmadı.

---

### P2-05 · Tablet UI Test Edilmedi

**Durum:** OPEN  
**Tespit:** `supportsTablet: true` var, iPad test yapılmadı.

---

## P3 — MINOR (3 adet)

### P3-01 · Adaptive Icon Ayrı Foreground Katmanı Yok

`adaptiveIcon.foregroundImage` ana `icon.png` ile aynı. Materyal Design adaptive icon için ayrı foreground (transparent background) PNG önerilir.

### P3-02 · App Name Aksan Tutarsızlığı

`app.json` `name` alanı `"CanYoldasi"` (aksansız). `CFBundleDisplayName: "CanYoldaşı"` doğru. App Store listing adının ikisiyle eşleştiğinden emin ol.

### P3-03 · DEV Guard'lı console.log

`services/revenueCat.ts` içinde `__DEV__` korumalı log satırları var. Production'da çıkmaz; log temizliği önerilir.
