# CanYoldaşı — Google Play Hazırlık Denetimi (Android)
**Tarih:** 20 Temmuz 2026

Durum: ✅ Hazır · ⚠️ Eksik/Doğrulanmadı · ❌ Yok/Gerekli

---

## Teknik Yapılandırma

| Madde | Durum | Not |
|---|---|---|
| Package name | ✅ | `com.canyoldasi.app` |
| versionCode | ✅ | 1 |
| versionName | ✅ | 1.0.0 |
| App icon | ✅ | assets/images/icon.png |
| Adaptive icon | ⚠️ | Tek katman; ayrı foreground önerilir |
| Splash screen | ✅ | expo-splash-screen |
| Build type | ✅ | `app-bundle` (eas.json production) |
| Play App Signing | ❌ | EAS build yapılmadı |
| Target API | ⚠️ | Expo SDK 54 default; Android 14 (API 34) beklentisi |

## Android İzinleri

| İzin | Durum | Not |
|---|---|---|
| ACCESS_FINE_LOCATION | ✅ | var |
| ACCESS_COARSE_LOCATION | ✅ | var |
| CAMERA | ✅ | var |
| VIBRATE | ✅ | var |
| RECORD_AUDIO | ✅ | blockedPermissions'da |
| INTERNET | ⚠️ | Expo otomatik ekler; doğrulanmadı |
| BILLING | ⚠️ | RevenueCat otomatik ekler; doğrulanmadı |
| POST_NOTIFICATIONS | ❌ | **Eksik — Android 13+ — P0** |
| READ_MEDIA_IMAGES | ⚠️ | Android 13+ galeri erişimi; expo-image-picker otomatik ekleyebilir |

## Google Play Console Metadata

| Madde | Durum | Eylem |
|---|---|---|
| Google Play Developer hesabı | ⚠️ | Kullanıcı tarafından doğrulanmalı |
| Uygulama kaydı | ⚠️ | Kullanıcı tarafından oluşturulmalı |
| Package name eşleşmesi | ⚠️ | Play Console'a kayıtlı olmalı |
| App adı | ⚠️ | "CanYoldaşı" girilmeli |
| Kısa açıklama | ❌ | Hazırlanmadı (maks 80 char) |
| Tam açıklama | ❌ | Hazırlanmadı (maks 4000 char) |
| App icon (512×512) | ⚠️ | Yüklenmeli |
| Feature graphic (1024×500) | ❌ | Hazırlanmadı |
| Telefon ekran görüntüleri | ❌ | Min 2, önerilen 4–8 |
| Tablet ekran görüntüleri | ⚠️ | tablet desteği açıksa gerekebilir |
| Kategori | ❌ | Seçilmedi |
| Content rating | ❌ | Anket doldurulmadı |
| Target audience | ❌ | Yaş grubu seçilmedi |
| Ads declaration | ⚠️ | Reklam yok — beyan edilmeli |
| Data Safety | ❌ | Veri toplama/paylaşma beyanları girilmedi |
| Privacy policy URL | ❌ | Web URL gerekli |
| Account deletion web URL | ⚠️ | Play Store gerektiriyor; uygulama içi var ama web URL'i de gerekli |
| App access / demo account | ❌ | Hazırlanmadı |
| Content declarations | ❌ | Tamamlanmadı |
| Financial features | ⚠️ | IAP var; beyan gerekli |
| Health features | ⚠️ | Pet health data var; beyan gerekebilir |
| Kamera/konum gerekçeleri | ⚠️ | Permissions declaration gerekli |

## IAP / Abonelik

| Madde | Durum | Not |
|---|---|---|
| Abonelik ürünleri | ❌ | Oluşturulmadı |
| Base plan (monthly) | ❌ | Oluşturulmadı |
| Base plan (annual) | ❌ | Oluşturulmadı |
| Boost IAP (consumable) | ❌ | Oluşturulmadı |
| Ülke/bölge erişimi | ⚠️ | Türkiye başlangıç; diğerleri opsiyonel |
| License tester | ❌ | Eklenmedi |
| Closed/internal test | ❌ | Oluşturulmadı |
| RevenueCat Google credentials | ⚠️ | Service account doğrulanmadı |
| Real-time developer notifications | ⚠️ | RevenueCat için gerekli |
| İlk AAB manuel yükleme | ❌ | Google Play ilk sürümün manuel AAB yüklenmesini gerektirir |

## Önemli Notlar

1. **İlk Android gönderiminde** AAB dosyasının Play Console'a manuel olarak yüklenmesi gerekiyor (`eas submit` öncesinde el ile upload).
2. **Production rollout** kademeli yapılabilir (%10 → %50 → %100).
3. `RECORD_AUDIO` blockedPermissions'da doğru şekilde belirtilmiş ✅.
4. Billing izni RevenueCat tarafından otomatik ekleniyor ancak AAB build'de doğrulanmadı.
