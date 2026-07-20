# CanYoldaşı — RevenueCat Audit
**Tarih:** 20 Temmuz 2026

---

## RC Yapılandırması

| Parametre | Değer |
|---|---|
| Pet Premium Offering ID | `canyoldasi_pet_premium` |
| Pet Premium Entitlement | `pet_premium` |
| Pet Premium Paketler | `$rc_monthly`, `$rc_annual` |
| Boost Offering ID | `canyoldasi_boost` |
| iOS SDK Key | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (env) |
| Android SDK Key | `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (env) |
| Legacy SDK Key | `EXPO_PUBLIC_REVENUECAT_API_KEY` (dev fallback) |
| Server Secret | `REVENUECAT_SECRET_API_KEY` (server-only env) |
| Webhook Auth Token | `REVENUECAT_WEBHOOK_AUTH_TOKEN` (server env) |
| Webhook Signing Secret | `REVENUECAT_WEBHOOK_SIGNING_SECRET` (opsiyonel) |

---

## Kod Kalitesi Kontrolleri

### ✅ `offerings.all` kullanımı

```typescript
// artifacts/mobile/services/revenueCat.ts
const offering = offerings.all[PET_PREMIUM_OFFERING_ID] ?? null;
```

`offerings.current` YERİNE `offerings.all["canyoldasi_pet_premium"]` kullanılıyor. Bu kritik: `canyoldasi_boost` offering'i current olarak ayarlıysa pet premium karışmazdı. **PASS.**

### ✅ Paket Filtreleme ve Sıralama

```typescript
const packages = (offering.availablePackages as PurchasesPackage[])
  .filter((pkg) => SUPPORTED_PET_PREMIUM_PACKAGE_IDS.has(pkg.identifier))
  .sort((a, b) => {
    if (a.identifier === "$rc_monthly") return -1;
    if (b.identifier === "$rc_monthly") return 1;
    return 0;
  });
```

Yalnızca `$rc_monthly` ve `$rc_annual` döndürülüyor. Sıralama: aylık önce. **PASS.**

### ✅ Yıllık Varsayılan Seçim

```typescript
const annual = items.find((p) => p.identifier === "$rc_annual");
setSelected(annual ?? items[0] ?? null);
```

Eski regex `(/annual|year/i)` yerine tam eşleşme. **PASS.**

### ✅ Entitlement Doğrulaması (Satın Alma)

```typescript
const activeEntitlement = purchaseResult.customerInfo.entitlements.active[PET_PREMIUM_ENTITLEMENT_ID];
if (!activeEntitlement) { /* bilgi mesajı */ return; }
```

RC entitlement önce kontrol ediliyor, sonra backend. **PASS.**

### ✅ Restore Akışı

```typescript
const activeEntitlement = customerInfo.entitlements.active[PET_PREMIUM_ENTITLEMENT_ID];
if (!activeEntitlement) {
  Alert.alert("Aktif Abonelik Bulunamadı", "...");
  return;
}
```

Entitlement yoksa sahte başarı mesajı gösterilmiyor. **PASS.**

### ✅ Hata Mesajı Ayrımı

```
offering_not_found: → "Evcilim Premium paketleri yapılandırılmamış."
no_packages:        → "Evcilim Premium paketleri henüz hazır değil."
SDK error           → "Satın alma sistemi başlatılamadı."
genel               → "Paketler şu anda yüklenemiyor."
```

**PASS.**

### ✅ Boost Sistemi Korunuyor

`fetchOfferings()` (boost) ve `fetchPetPremiumOfferings()` (pet premium) tamamen ayrı. **PASS.**

### ✅ Secret Key Client'ta Yok

`REVENUECAT_SECRET_API_KEY` yalnızca `artifacts/api-server/src/` içinde kullanılıyor. **PASS.**

### ✅ Platform-Specific Keys

```typescript
// iOS: EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
// Android: EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
// Dev fallback: EXPO_PUBLIC_REVENUECAT_API_KEY
```

**PASS.**

---

## Webhook (`/api/webhooks/revenuecat`)

| Kontrol | Durum |
|---|---|
| Raw body JSON'dan önce | **PASS** |
| Auth token doğrulama | **PASS** |
| Opsiyonel HMAC | **PASS** |
| Idempotency (`revenuecat_webhook_events`) | **PASS** |
| `INITIAL_PURCHASE` işleme | **STATIC REVIEW** |
| `RENEWAL` işleme | **STATIC REVIEW** |
| `CANCELLATION` / `EXPIRATION` | **STATIC REVIEW** |
| Grace period | **STATIC REVIEW** |

---

## RC Dashboard Yapılacaklar (Manuel)

Production'a geçmeden önce RC Dashboard'da yapılması gerekenler:

1. **Offering oluştur:** `canyoldasi_pet_premium`
2. **Paket ekle:** `$rc_monthly` ve `$rc_annual`
3. **Ürün bağla:** App Store Connect + Google Play'deki ürün ID'lerini paketle ilişkilendir
4. **Entitlement oluştur:** `pet_premium`
5. **Entitlement–Paket bağlantısı:** Her iki paketi `pet_premium` entitlement'ına bağla
6. **Webhook URL:** Production API URL'ini RC dashboard'a gir
7. **iOS public key:** `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` env var'ı set et
8. **Android public key:** `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` env var'ı set et
9. **App User ID:** RC'nin JWT `sub` claim'iyle eşleştiğinden emin ol (mevcut koda göre doğru)

---

## Eksik / Doğrulanamayan (BLOCKED)

| Madde | Sebep |
|---|---|
| Apple Sandbox satın alma | Fiziksel cihaz + Apple Sandbox hesabı gerekli |
| Google Play License Tester | Fiziksel Android cihaz + Play Console gerekli |
| Webhook tetikleme | Gerçek satın alma gerekli |
| Entitlement aktivasyon süresi | Sandbox testleri gerekli |
| Abonelik yenileme | Sandbox hızlandırılmış zamanlama testi gerekli |
| İade / revoke akışı | Sandbox + RC dashboard gerekli |
| `restorePurchases()` sonrası RC response | Fiziksel cihaz gerekli |

---

## RC Production Launch Checklist

- [ ] RC Dashboard'da offering/package/entitlement yapılandırması tamamlandı
- [ ] iOS App Store ürün ID'leri RC'ye bağlandı
- [ ] Android Play Console ürün ID'leri RC'ye bağlandı
- [ ] Webhook URL production endpoint'e işaret ediyor
- [ ] Webhook auth token güçlü bir değer (CSPRNG)
- [ ] Apple Sandbox hesabıyla tam IAP akışı test edildi
- [ ] Google License Tester ile tam IAP akışı test edildi
- [ ] Backend `isPremium: true` döndüğü doğrulandı
- [ ] Restore purchases akışı test edildi
- [ ] `canyoldasi_boost` offering'i ayrı çalışıyor, karışmıyor
