# CanYoldaşı — 24 Saatlik Release Planı
**Tarih:** 20 Temmuz 2026  
**Hedef:** Mağaza gönderime hazır, tüm P0 ve P1 kapatılmış

> ⚠️ Bu plan mağazalara otomatik gönderim yetkisi vermez. Her adım için açık onay gereklidir.

---

## Durum Göstergesi

| Öncelik | Sayı |
|---|---|
| P0 — RELEASE BLOCKER | 1 (push notifications) |
| P1 — Critical | 4 |
| P2 — Major | 5 |
| P3 — Minor | 3 |

---

## 0–2. Saat: P0 Düzeltmesi — Push Notifications

**Hedef:** P0-01'i kapat

### Adım 1: expo-notifications Kurulumu
```bash
pnpm --filter @workspace/mobile add expo-notifications
```

### Adım 2: app.json Plugin Ekle
```json
["expo-notifications", {
  "icon": "./assets/images/icon.png",
  "color": "#7C45D9",
  "sounds": []
}]
```

### Adım 3: Android POST_NOTIFICATIONS İzni
`app.json` android.permissions'a ekle:
```json
"android.permission.POST_NOTIFICATIONS"
```

### Adım 4: Push Token Kayıt Akışı
`artifacts/mobile/contexts/AuthContext.tsx` içinde kullanıcı giriş yaptıktan sonra:
```typescript
import * as Notifications from 'expo-notifications';

async function registerPushToken(userId: string, authToken: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = await Notifications.getExpoPushTokenAsync();
  await apiFetch('/notifications/push-token', {
    method: 'POST',
    body: JSON.stringify({ token: token.data })
  });
}
```

### Adım 5: TypeScript Kontrol
```bash
pnpm --filter @workspace/mobile run typecheck
```

**Beklenen süre:** ~60 dakika  
**Manuel adım:** Backend push token endpoint kontrolü

---

## 2–6. Saat: P1-01 — i18n Eksik Ekranlar

**Hedef:** Kritik ekranlarda hardcoded string'leri i18n'e taşı

Öncelikli ekranlar (en çok kullanılan akışlar):
1. `app/add-animal.tsx` — hayvan ekleme formu
2. `app/add-adoption.tsx` — ilan oluşturma
3. `app/evcilim-premium.tsx` — satın alma ekranı (cepten para alınan ekran)
4. `app/animal/[id].tsx` — hayvan detay
5. `app/adoption/edit/[id].tsx` — ilan düzenleme

Her ekran için:
```typescript
const { t } = useTranslation();
// string literals → t("key")
// tr.json + en.json güncelle
```

**Beklenen süre:** ~3 saat  
**Not:** i18n eksikliği App Store/Play Store reviewında red sebebi olmasa da uygulamanın "İngilizce" açıklandığı durumlarda sorun çıkarır.

---

## 6–12. Saat: Abonelik Yönetim Linki + Web Production Build

### Adım 1: Abonelik Yönetim Linki (P2-03)

`artifacts/mobile/app/(tabs)/account.tsx` Premium bölümüne:
```typescript
const openSubscriptionManagement = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('https://apps.apple.com/account/subscriptions');
  } else if (Platform.OS === 'android') {
    Linking.openURL('https://play.google.com/store/account/subscriptions');
  }
};
```

### Adım 2: Web Production Build (P2-02)
```bash
cd artifacts/mobile && npx expo export --platform web
```
Kontrol edilecekler:
- [ ] Bundle boyutu makul (< 10 MB)
- [ ] react-native-maps stub çalışıyor
- [ ] Auth flow web'de çalışıyor
- [ ] Premium modal web'de "Satın alma uygulamadan yapılır" mesajı gösteriyor

### Adım 3: Account Deletion Web URL
Demo veya basit bir web sayfası oluştur: `https://[domain]/account-delete` → Play Store zorunluluğu.

**Beklenen süre:** ~3 saat

---

## 12–18. Saat: EAS Build + Fiziksel Cihaz Hazırlık

**Bu adımlar kullanıcı onayı ve credentials gerektirir.**

### EAS Build (BLOCKED — kullanıcı onayı gerekli)

```bash
# iOS build
eas build --platform ios --profile production

# Android build  
eas build --platform android --profile production
```

**Gereksinimler:**
- Apple Developer account + distribution certificate + provisioning profile
- Google Play Keystore (Play App Signing)
- `APP_STORE_CONNECT_APP_ID` env var
- `APPLE_TEAM_ID` env var

### Fiziksel Cihaz Test Listesi (TestFlight / Play Internal)

iOS (iPhone):
- [ ] Kamera izni + fotoğraf çekme
- [ ] Konum izni + harita görünümü
- [ ] Push notification alımı
- [ ] Hayvan ekleme → DB doğrulama
- [ ] Premium modal → Apple Sandbox satın alma
- [ ] Restore purchases
- [ ] Tab bar görünümü (liquid glass iOS 26+)

Android (fiziksel cihaz):
- [ ] Lucide ikon görünümü
- [ ] Kamera + galeri
- [ ] Konum
- [ ] Push notification (FCM)
- [ ] Google Maps tile yükleme
- [ ] Premium modal → Google Play License Tester
- [ ] Restore purchases

**Beklenen süre:** ~4 saat (build + test)

---

## 18–24. Saat: Store Metadata + Final Checklist

### App Store Connect Metadata
- [ ] Uygulama adı: "CanYoldaşı"
- [ ] Türkçe açıklama (4000 char)
- [ ] İngilizce açıklama
- [ ] Anahtar kelimeler: sokak hayvanları, evcil hayvan, sahiplendirme, hayvan yardımı
- [ ] Support URL, Privacy Policy URL, Terms URL
- [ ] Ekran görüntüleri: iPhone 6.9" ve 6.5" (min 3'er)
- [ ] App icon 1024×1024
- [ ] Yaş sınıfı anketi
- [ ] Veri beyanları (Privacy practices)
- [ ] IAP ürünleri: aylık/yıllık abonelik, boost paketi → Ready to Submit
- [ ] Review notları (bkz. `APP_REVIEW_NOTES_EN.md`)
- [ ] Demo hesabı bilgileri

### Google Play Console Metadata
- [ ] Uygulama adı: "CanYoldaşı"
- [ ] Türkçe kısa açıklama (80 char)
- [ ] Tam açıklama
- [ ] App icon 512×512
- [ ] Feature graphic 1024×500
- [ ] Ekran görüntüleri (min 2)
- [ ] Content rating anketi
- [ ] Data Safety beyanı
- [ ] Privacy Policy URL
- [ ] Hesap silme web URL
- [ ] Abonelik ürünleri + base plan oluşturma
- [ ] License tester ekleme
- [ ] RevenueCat service account bağlantısı
- [ ] İlk AAB manuel yükleme (internal test track)
- [ ] App access / demo hesabı girişi

### RevenueCat Dashboard (Manuel)
- [ ] `canyoldasi_pet_premium` offering oluştur
- [ ] `$rc_monthly` ve `$rc_annual` paket ekle
- [ ] `pet_premium` entitlement oluştur ve paketlere bağla
- [ ] iOS ürün ID'lerini bağla
- [ ] Android ürün ID'lerini bağla
- [ ] Webhook URL production endpoint'i
- [ ] Apple Sandbox ile end-to-end test

---

## Final Release Gate

Gönderimden önce tüm maddeler ✅ olmalı:

- [ ] P0 açık hata = 0
- [ ] P1 açık hata = 0
- [ ] TypeScript PASS
- [ ] Web production build PASS
- [ ] Push notifications çalışıyor (fiziksel cihaz)
- [ ] iOS fiziksel cihaz ana akış PASS
- [ ] Android fiziksel cihaz ana akış PASS
- [ ] Apple Sandbox satın alma PASS
- [ ] Google Play License Tester PASS
- [ ] Restore purchases PASS
- [ ] RC `pet_premium` entitlement backend doğrulama PASS
- [ ] App Store metadata hazır
- [ ] Google Play metadata hazır
- [ ] Review demo hesabı aktif
- [ ] Store screenshots hazır
- [ ] Abonelik yönetim linki var
- [ ] Privacy policy + terms web URL'i erişilebilir
- [ ] Hesap silme web URL'i erişilebilir (Play)

---

## Manuel Kullanıcı İşlemleri (Ajan Yapamaz)

1. Apple Developer Console — Distribution certificate + provisioning profile
2. App Store Connect — Uygulama oluşturma, metadata, IAP tanımları
3. EAS Build için Apple/Google credentials girişi
4. Google Play Console — Uygulama oluşturma, ilk AAB manuel yükleme
5. RevenueCat Dashboard — Offering/package/entitlement yapılandırması
6. Sandbox hesapları (Apple Sandbox, Google License Tester) oluşturma
7. Fiziksel iOS ve Android cihazlarda test yapma

---

## Engeller

| Engel | Çözüm |
|---|---|
| EAS credentials yok | Apple Developer + Google Play Console girişi gerekli |
| Fiziksel cihaz yok | TestFlight / Play Internal test cihazı temin edilmeli |
| RC sandbox hesabı yok | Apple Sandbox + Google License Tester hesabı oluşturulmalı |
| IAP ürünleri oluşturulmadı | App Store Connect + Play Console'da manuel oluşturma |
| Privacy policy web URL yok | Web sayfası oluşturulmalı veya mevcut ekran web URL'e taşınmalı |
