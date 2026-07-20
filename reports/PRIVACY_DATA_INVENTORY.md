# CanYoldaşı — Privacy & Data Inventory
**Tarih:** 20 Temmuz 2026

---

## Toplanan Veri Türleri

| Veri Kategorisi | Tablo/Kaynak | Toplayan Taraf | Amaç |
|---|---|---|---|
| Ad / Soyad | `local_users` | CanYoldaşı (backend) | Kullanıcı kimliği |
| E-posta adresi | `local_users` | CanYoldaşı (backend) | Giriş / bildirim |
| Telefon numarası | `local_users` | CanYoldaşı (backend) | Kayıt doğrulama |
| Şifre (bcrypt hash) | `local_users` | CanYoldaşı (backend) | Kimlik doğrulama |
| Profil fotoğrafı | Object Storage | CanYoldaşı (backend) | Profil |
| Konum verileri | `stray_animals` | CanYoldaşı (backend) | Harita gösterimi |
| Evcil hayvan adı/türü/yaşı | `pet_profiles` | CanYoldaşı (backend) | Evcil hayvan yönetimi |
| Evcil hayvan fotoğrafları | Object Storage | CanYoldaşı (backend) | Profil |
| Veteriner randevuları | `pet_appointments` | CanYoldaşı (backend) | Hatırlatıcı |
| Aşı bilgileri | `pet_vaccinations` | CanYoldaşı (backend) | Sağlık takibi |
| İlaç bilgileri | `pet_medications` | CanYoldaşı (backend) | Sağlık takibi |
| Mesajlar | `messages`, `conversations` | CanYoldaşı (backend) | Kullanıcılar arası iletişim |
| Sahiplendirme ilanları | `adoption_listings` | CanYoldaşı (backend) | İlan yönetimi |
| Sokak hayvanı raporları | `stray_animals` | CanYoldaşı (backend) | Topluluk bildirim |
| Push token | (push altyapısı eksik) | — | Bildirim |
| Satın alma geçmişi | `listing_promotion_purchases`, `revenuecat_webhook_events` | CanYoldaşı + RevenueCat | Premium/boost |
| IP adresi | Rate limiter (in-memory) | CanYoldaşı (backend) | Güvenlik |
| JWT token | AsyncStorage | Cihaz | Session |

---

## Üçüncü Taraf SDK'lar ve Veri Paylaşımı

| SDK | Paylaşılan Veri | Amaç | Beyan Gerekli |
|---|---|---|---|
| RevenueCat (`react-native-purchases`) | User ID, satın alma bilgisi | IAP yönetimi | **EVET** — App Store + Play Console |
| Resend (server-side) | E-posta adresi | Şifre sıfırlama e-postası | **EVET** |
| OpenAI (server-side) | AI asistan sorguları | Pet AI | **EVET** (içerik analitik) |
| react-native-maps | Konum tile istekleri | Harita gösterimi | **EVET** |
| expo-location | Cihaz GPS konumu | Hayvan konumu | **EVET** |
| expo-image-picker | Galeri/kamera erişimi | Fotoğraf yükleme | **EVET** |
| Expo (EAS / Updates) | Build & update | App delivery | **EVET** |

---

## App Store Privacy Labels (Gerekli Beyanlar)

### Kullanıcıyı Takip Eden Veriler
- **Hiçbiri** (doğrudan reklamcılık yok)

### Kullanıcıya Bağlı Veriler
- İletişim bilgileri: Ad, e-posta, telefon
- Konum: Tam konum (sokak hayvanı raporlama)
- Fotoğraflar: Kullanıcı yükleme
- Kullanıcı içeriği: Mesajlar, yorumlar
- Kimlik: Kullanıcı ID

### Kullanıcıya Bağlı Olmayan Veriler
- Tanı: Çöp logları (varsa)

---

## Google Play Data Safety (Beyan Edilmesi Gerekenler)

| Kategori | Toplanıyor | Paylaşılıyor | Şifrelenmiş | Silme İmkânı |
|---|---|---|---|---|
| Ad | Evet | Hayır | Evet (HTTPS) | Evet (hesap sil) |
| E-posta | Evet | Hayır | Evet | Evet |
| Telefon | Evet | Hayır | Evet | Evet |
| Fotoğraf | Evet | Hayır | Evet | Evet |
| Kesin konum | Evet (isteğe bağlı) | Hayır | Evet | Evet |
| Uygulama aktivitesi | Evet (log) | Hayır | Evet | Kısmen |
| Satın alma geçmişi | Evet (RevenueCat) | RevenueCat | Evet | Evet |

---

## Hesap Silme

**API Endpoint:** `DELETE /api/auth/account` — şifre doğrulama zorunlu  
**UI:** Ayarlar > Hesabı Sil (account.tsx)  
**Web URL:** Uygulamadan erişilebilir (Play Store gereksinimi için)

**Silinen veriler:**
- `animal_notifications`
- `adoption_listing_follows`
- `animal_interactions`
- `volunteer_claims`
- `report_confirmations`
- `social_profiles`
- `local_users`

**Silinmeyen veriler (retention):**
- `stray_animals` (anonim topluluk verisi kalabilir)
- `adoption_listings` (ilanların kaldırılma politikası belgelenmeli)
- `messages` (konuşma geçmişi silme politikası belgelenmeli)

**Eksik:** Hesap silinince Object Storage'daki kullanıcı dosyaları (profil fotoğrafı, pet fotoğrafları, belge dosyaları) temizleniyor mu? — doğrulanmadı.

---

## Gizlilik Politikası & Kullanım Şartları

- Gizlilik politikası ekranı: `app/privacy-policy.tsx` — **var**
- Kullanım şartları ekranı: `app/terms-of-service.tsx` — **var**
- Harici URL gereksinimi: App Store ve Play Console'a URL girilmeli

**Eksik:** Her iki dokümanın bir web URL'i üzerinden erişilebilir olması gerekiyor (mağaza meta verisi için). Şu an yalnızca uygulama içi ekran mevcut.
