# CanYoldaşı — Apple App Store İnceleme Notları (Türkçe)
**Tarih:** 20 Temmuz 2026  
**App Store Connect Review Notes alanına kopyalanabilir.**

---

## Uygulamanın Amacı

CanYoldaşı, Türkiye'deki sokak hayvanlarını raporlamak, takip etmek ve sahiplendirme ilanları yönetmek için geliştirilmiş topluluk odaklı bir mobil uygulamadır. Kullanıcılar haritada sokak hayvanı bildirimi yapabilir, evcil hayvanlarını yönetebilir ve sahiplendirme ilanı oluşturabilir.

---

## Demo Hesabı

İnceleme ekibinin uygulamayı test etmesi için aşağıdaki hesabı kullanabilirsiniz:

> **E-posta:** demo@canyoldasi.app  
> **Şifre:** DemoReview2026!

*(Bu hesabı App Store Connect'e gönderimden önce oluşturun ve test edin.)*

---

## Temel Özellikler ve Erişim Adımları

### 1. Sokak Hayvani Haritası (Ana Sekme)
- Uygulamayı açın → Alt sekmelerdeki ilk sekme (Harita)
- Haritada İstanbul çevresinde renkli pati ikonları görünür
- Bir pati ikonuna dokunun → Hayvan detay kartı açılır
- "Yardım et" butonuyla hayvanı beslediğinizi işaretleyebilirsiniz
- Sağ üstteki "+" butonu ile yeni hayvan bildirimi yapılabilir (konum + fotoğraf)

### 2. Sahiplendirme İlanları (İkinci Sekme)
- İlanlar listesinde sahiplenmeye açık hayvanlar görünür
- Bir ilana dokunun → Detay, iletişim ve "Mesaj Gönder" butonu
- Sağ üstteki "+" ile yeni ilan oluşturulabilir

### 3. Evcilim (Üçüncü Sekme)
- İlk evcil hayvan **ücretsiz** eklenebilir
- "+" butonuna basın → Form doldurun → Kaydet
- **İkinci ve sonraki hayvanlar Evcilim Premium gerektirir**
- Premium eklenince: Belgeler, İlaçlar ve AI Hayvan Asistanı aktifleşir

### 4. Evcilim Premium Satın Alma
- Mevcut bir evcil hayvanın sayfasından "Belgeler" veya "İlaçlar" bölümüne girin
- Ya da "+" ile ikinci hayvan eklemeye çalışın
- Evcilim Premium ekranı açılır
- Aylık veya Yıllık paket seçin → "Premium'a Geç" butonuna basın
- **Satın alımları Geri Yükle** butonu ekranın altında yer alır

### 5. İlan Öne Çıkarma (Boost)
- Sahiplendirme ilanı oluşturduktan sonra, ilan detay sayfasında "İlanı Öne Çıkar" seçeneği
- Farklı paketler (24 saat, 3 gün, 7 gün) sunulur

### 6. Mesajlaşma
- Sahiplendirme ilanı sayfasında "Mesaj Gönder" butonu
- Mesajlarım sekmesinden tüm konuşmalar listelenir

### 7. Hesap ve Ayarlar (Dördüncü Sekme)
- Profil düzenleme, şifre değiştirme
- Gizlilik Politikası ve Kullanım Şartları bağlantıları
- **Hesabı Sil**: Ayarlar > Hesabı Sil > Şifre onayı

---

## Premium Özellikler — Erişim Adımları

İkinci hayvan kuralını test etmek için:
1. Demo hesabıyla giriş yapın
2. Evcilim sekmesine gidin (zaten 1 hayvan var)
3. "+" butonuna basın
4. Evcilim Premium ekranı otomatik açılır

Belge/İlaç özelliğini test etmek için:
1. Mevcut hayvana dokunun
2. "Belgeler" veya "İlaçlar" sekmesine gidin
3. Premium gereğini gösteren ekran açılır

---

## Konum ve Kamera Kullanımı

- **Konum:** Sokak hayvanı bildirimi yaparken veya haritada konumunuzu görmek için kullanılır. Konum izni reddedilirse uygulama çalışmaya devam eder (manuel konum girişi desteklenir).
- **Kamera:** Hayvan fotoğrafı çekmek, profil fotoğrafı eklemek veya belge yüklemek için kullanılır. İzin reddedilirse galeri seçimi kullanılabilir.
- **Fotoğraf Galerisi:** Yukarıdaki işlemler için galeri erişimi.

---

## Satın Alımları Geri Yükleme

- Evcilim Premium ekranının altındaki "Satın Alımları Geri Yükle" butonu
- Aynı Apple ID ile yapılan önceki satın alımlar geri yüklenir

---

## Hesap Silme Yolu

1. Alt sekme → Hesap (dördüncü sekme)
2. Sayfayı aşağı kaydırın → "Hesabı Sil"
3. Şifrenizi girin → Onaylayın
4. Tüm kullanıcı verileri kalıcı olarak silinir

---

## Backend Durumu

İnceleme süresince backend sunucusu aktif olacaktır:  
`https://[REPLIT_DOMAIN]/api`

Herhangi bir sorun olması halinde destek e-posta adresi: destek@canyoldasi.app
