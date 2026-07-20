# CanYoldaşı — Google Play İnceleme Notları (Türkçe)
**Tarih:** 20 Temmuz 2026  
**Google Play Console → App content → App access alanına girilecek notlar.**

---

## Uygulamanın Amacı

CanYoldaşı, Türkiye'deki sokak hayvanlarını raporlamak, takip etmek ve sahiplendirme ilanları yönetmek için geliştirilmiş topluluk odaklı bir mobil uygulamadır.

---

## Demo Hesabı (App Access)

Uygulamanın tüm özelliklerine erişmek için:

> **E-posta:** demo@canyoldasi.app  
> **Şifre:** DemoReview2026!  
> **Durum:** Premium üye (tüm özellikler açık)

*(Gönderimden önce oluşturun ve test edin.)*

---

## Özellik Kısıtlamaları

Aşağıdaki özellikler yalnızca **Evcilim Premium** aboneliğiyle kullanılabilir:
- İkinci ve sonraki evcil hayvan ekleme
- Evcil hayvan belgeleri yükleme
- İlaç takibi
- AI Hayvan Asistanı

**Demo hesabı Premium aktif olduğundan tüm bu özelliklere erişebilirsiniz.**

---

## Temel Özellikler ve Erişim Adımları

### Sokak Hayvani Haritası
Uygulamayı açın → İlk sekme (Harita) → İstanbul çevresinde hayvan raporları görünür. Pati ikonuna dokunun, detayları inceleyin. "+" ile yeni hayvan bildirimi yapın.

### Sahiplendirme İlanları
İkinci sekme → İlan listesi → İlana dokunun → Detaylar + "Mesaj Gönder". "+" ile yeni ilan oluşturun.

### Evcilim (Evcil Hayvan Yönetimi)
Üçüncü sekme → Evcil hayvanlar listelenir. Birinci hayvan ücretsiz. İkinci hayvan için Evcilim Premium gerekir. Demo hesabında zaten Premium aktif.

### Evcilim Premium Satın Alma
Üçüncü sekme → "+" (ikinci hayvan için) VEYA evcil hayvan detayı → Belgeler → Premium ekranı açılır. Aylık veya Yıllık seçin.

### İlan Öne Çıkarma
Sahiplendirme ilanı → "İlanı Öne Çıkar" → Paket seçin (Google Play In-App Purchase).

### Hesap ve Ayarlar
Dördüncü sekme → Profil düzenleme, şifre değiştirme, gizlilik politikası, kullanım şartları, **hesap silme**.

---

## Konum ve Kamera İzinleri

- **Konum (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION):** Sokak hayvanı bildirimi için hayvanın konumunu haritada işaretlemek ve kullanıcının konumuna göre yakındaki hayvanları göstermek için kullanılır.
- **Kamera (CAMERA):** Hayvan fotoğrafı çekmek, profil ve ilanlar için görsel eklemek amacıyla kullanılır.
- **Galeri:** Mevcut fotoğrafları yüklemek için kullanılır.

İzinler reddedilirse uygulama temel işlevlerine devam eder; yalnızca ilgili özellik devre dışı kalır.

---

## Satın Alımları Geri Yükleme

Evcilim Premium ekranında → "Satın Alımları Geri Yükle" butonu mevcut.

---

## Hesap Silme

1. Dördüncü sekme → Hesap
2. Sayfayı aşağı kaydırın → "Hesabı Sil"
3. Şifrenizi girin → Onayla
4. Tüm veriler kalıcı olarak silinir

**Web üzerinden hesap silme:** `https://[REPLIT_DOMAIN]/hesap-sil` *(uygulama içindeki aynı akış web'de de erişilebilir olacak)*

---

## Veri Güvenliği Beyanı Özeti

| Veri | Toplanıyor | Paylaşılıyor | Şifrelenmiş |
|---|---|---|---|
| Ad / E-posta / Telefon | Evet | Hayır | Evet |
| Konum | Evet (isteğe bağlı) | Hayır | Evet |
| Fotoğraflar | Evet | Hayır | Evet |
| Satın alma geçmişi | Evet (RevenueCat) | RevenueCat | Evet |
| Mesajlar | Evet | Hayır | Evet |

---

## Backend Durumu

İnceleme süresince backend aktif: `https://[REPLIT_DOMAIN]/api`
