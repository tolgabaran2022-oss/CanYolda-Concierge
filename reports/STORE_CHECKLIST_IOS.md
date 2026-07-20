# CanYoldaşı — App Store Hazırlık Denetimi (iOS)
**Tarih:** 20 Temmuz 2026

Durum: ✅ Hazır · ⚠️ Eksik/Doğrulanmadı · ❌ Yok/Gerekli

---

## Teknik Yapılandırma

| Madde | Durum | Not |
|---|---|---|
| Bundle identifier | ✅ | `com.canyoldasi.app` |
| Display Name | ✅ | `CanYoldaşı` (CFBundleDisplayName) |
| Sürüm | ✅ | 1.0.0 |
| Build Number | ✅ | 1 |
| Orientation | ✅ | Portrait |
| Tablet desteği | ⚠️ | `supportsTablet: true` — iPad UI test edilmedi |
| App icon | ✅ | assets/images/icon.png |
| Splash screen | ✅ | expo-splash-screen plugin |
| URL scheme | ✅ | `com.canyoldasi.app`, `mobile` |
| Şifreleme beyanı | ✅ | `ITSAppUsesNonExemptEncryption: false` |
| APS environment | ✅ | `production` (push capability) |
| expo-notifications plugin | ❌ | **Eksik — P0 bloker** |
| Privacy manifest | ⚠️ | Expo SDK 54 otomatik üretir; EAS build'de doğrulanmadı |
| EAS distribution | ⚠️ | `store` — credentials gerekli |

## İzin Açıklamaları

| İzin | Durum | Açıklama |
|---|---|---|
| NSCameraUsageDescription | ✅ | "Yakındaki sokak hayvanlarının durumunu fotoğraflayarak bildirebilmeniz için kamera erişimi gereklidir." |
| NSPhotoLibraryUsageDescription | ✅ | Mevcut |
| NSLocationWhenInUseUsageDescription | ✅ | Mevcut |
| NSLocationAlwaysUsageDescription | ⚠️ | Kontrol edilmedi (konum plugin'den geliyor) |
| NSMicrophoneUsageDescription | ⚠️ | Gerekli değil, kontrol et |

## App Store Connect Metadata

| Madde | Durum | Eylem |
|---|---|---|
| Apple Developer hesabı | ⚠️ | Kullanıcı tarafından doğrulanmalı |
| App Store Connect uygulaması | ⚠️ | Kullanıcı tarafından oluşturulmalı |
| Bundle ID eşleşmesi | ⚠️ | App Store Connect'e kayıtlı olmalı |
| Distribution certificate | ❌ | EAS credentials gerekli |
| Provisioning profile | ❌ | EAS credentials gerekli |
| App adı | ⚠️ | "CanYoldaşı" girilmeli |
| Alt başlık | ⚠️ | Girilmedi (maks 30 char) |
| Açıklama | ❌ | Hazırlanmadı |
| Anahtar kelimeler | ❌ | Hazırlanmadı |
| Support URL | ❌ | Girilmedi |
| Privacy Policy URL | ❌ | Web URL hazırlanmadı (uygulama içi ekran var) |
| Marketing URL | ⚠️ | Opsiyonel |
| Kategori | ❌ | Seçilmedi (Social Networking / Lifestyle) |
| Yaş sınıfı | ❌ | Rating anketi doldurulmadı |
| Content rights | ❌ | Beyan yapılmadı |
| Export compliance | ✅ | `ITSAppUsesNonExemptEncryption: false` |
| App Privacy cevapları | ❌ | Veri toplama beyanı yapılmadı |
| Üçüncü taraf SDK beyanları | ❌ | RevenueCat, OpenAI, Resend, Maps |
| Hesap silme | ✅ | Uygulama içi akış var; web URL'i girilmeli |
| Review demo hesabı | ❌ | Hazırlanmadı |
| Review notları | ❌ | Hazırlanmadı |
| Ekran görüntüleri (6.9") | ❌ | Hazırlanmadı |
| Ekran görüntüleri (6.5") | ❌ | Hazırlanmadı |
| Ekran görüntüleri (iPad) | ⚠️ | tablet desteği açık, gerekebilir |
| App icon (1024×1024) | ⚠️ | App Store Connect'e yüklenmeli |
| IAP açıklamaları | ❌ | Aylık/yıllık abonelik açıklaması gerekli |
| Abonelik koşulları URL | ❌ | Kullanım şartları web URL'i gerekli |
| Auto-renew açıklaması | ❌ | In-app satın alma metaverisi gerekli |
| Restore purchases butonu | ✅ | `evcilim-premium.tsx` içinde var |
| Subscription management linki | ❌ | **Eksik — P2** |
| Sign in with Apple | N/A | Uygulamada yok |
| TestFlight testi | ❌ | Yapılmadı |
| Gerçek cihaz testi | ❌ | Yapılmadı |
| Backend review süresince açık | ⚠️ | Replit deployment aktif olmalı |

## IAP Ürünleri (App Store Connect)

| Ürün | Tip | Durum |
|---|---|---|
| canyoldasi_pet_premium_monthly | Auto-renewable subscription | ❌ Oluşturulmadı |
| canyoldasi_pet_premium_annual | Auto-renewable subscription | ❌ Oluşturulmadı |
| canyoldasi_boost_* | Consumable IAP | ❌ Oluşturulmadı |

> İlk App Store gönderisiyle abonelik ürünleri aynı submission'a dahil edilmeli (Ready to Submit).

## Review Sonrası Kritik Notlar

Apple review sırasında:
1. Canlı backend'in çalışıyor olması gerekiyor
2. Demo hesabının çalışıyor olması gerekiyor
3. IAP sandbox modda test edilebilir olmalı
4. Konum ve kamera özelliklerinin review ekibine açık olması gerekiyor
