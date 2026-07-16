# CanYoldaşı — Manuel Cihaz Test Notları

> Tarih: 16 Temmuz 2026 | QA Turu: 1.0
> Platform hedefi: iOS | Android | Web

---

## Genel Not
Bu belge, API düzeyinde otomatik testlerle kapsamayan uçtan uca kullanıcı akışlarını içermektedir. Testler Expo web önizlemesi üzerinden yapılmıştır; iOS ve Android testleri Expo Go ile doğrulanmalıdır.

---

## MT-01: Auth Akışı

### MT-01-A: Kayıt → Giriş → Çıkış
1. Uygulamayı aç → Kayıt sayfasına git
2. E-posta ve şifre gir → Kaydol
3. Ana ekranın yüklendiğini doğrula
4. Profil tab'ına git → Çıkış yap
5. Giriş sayfasına yönlendirildiğini doğrula

**Beklenen:** Her adımda sorunsuz geçiş  
**Durum:** 🔲 iOS | 🔲 Android | 🔲 Web

---

## MT-02: Harita & Hayvan Bildirimi

### MT-02-A: Harita Yükleme
1. Ana tab'a git
2. Haritanın İstanbul'u merkez aldığını doğrula
3. Renkli markerlerin göründüğünü doğrula

**Beklenen:** Harita ve markerlar doğru render edilmeli  
**Durum:** 🔲 iOS | 🔲 Android | 🔲 Web (stub kullanılıyor)

### MT-02-B: Yeni Hayvan Bildirimi
1. "+" butonuna bas → Bildirim formu aç
2. Fotoğraf ekle (galeri/kamera)
3. Konum pin'ini haritaya koy
4. Durum seç, notlar yaz
5. Kaydet

**Beklenen:** Fotoğraf yükleme başarılı, URL alınıyor, hayvan haritaya ekleniyor  
**Durum:** 🔲 iOS | 🔲 Android | 🔲 Web

---

## MT-03: Mesajlaşma Akışı

### MT-03-A: İlan Sahibiyle Mesajlaşma
1. Sahiplendirme tab'ına git
2. Başka bir kullanıcının ilanına gir
3. "Mesaj Gönder" butonuna bas
4. Mesaj ekranı açılıyor mu doğrula
5. Mesaj yaz ve gönder
6. İkinci cihazda/hesapta mesajı gör

**Beklenen:** Konuşma oluşturulmalı, mesaj iletilmeli  
**Not:** BUG-002 düzeltmesi bu akışı onardı  
**Durum:** 🔲 iOS | 🔲 Android | 🔲 Web

---

## MT-04: Feed Etkileşimleri

### MT-04-A: Beğeni & Yorum
1. Feed tab'ına git
2. Bir gönderiye çift dokun (beğeni)
3. Yorum yap → gönder
4. Sayfayı yenile → yorum ve beğeni sayacı güncellendi mi?

**Beklenen:** Beğeni/yorum kalıcı, sayaçlar güncelleniyor  
**Not:** BUG-003 düzeltmesi bu akışı onardı  
**Durum:** 🔲 iOS | 🔲 Android | 🔲 Web

---

## MT-05: Sahiplendirme İlan Yönetimi

### MT-05-A: İlan Oluştur + Boost
1. Sahiplendirme tab'ına git → "İlan Oluştur"
2. Formu doldurup yayınla
3. Kendi ilanını bul → "Öne Çıkar"
4. Paket seç → IAP akışı başlıyor mu?

**Beklenen:** İlan oluşturulmalı, boost paketleri görünmeli  
**Durum:** 🔲 iOS | 🔲 Android | 🔲 Web

---

## MT-06: Evcil Hayvan Profili

### MT-06-A: Pet Oluştur + Aşı Ekle
1. Evcilim tab'ına git → "Pet Ekle"
2. Ad, tür, yaş gir, fotoğraf ekle
3. Pet profiline gir → Aşı sekmesi → Aşı ekle
4. Tarihleri gir → Kaydet

**Beklenen:** Pet ve aşı kaydedilmeli  
**Durum:** 🔲 iOS | 🔲 Android | 🔲 Web

---

## MT-07: Çapraz Platform Kontrol Listesi

| Özellik | iOS | Android | Web |
|---------|-----|---------|-----|
| Harita görünümü | 🔲 | 🔲 | 🔲 (stub) |
| Fotoğraf seçici | 🔲 | 🔲 | 🔲 |
| Mesajlaşma | 🔲 | 🔲 | 🔲 |
| Feed beğeni/yorum | 🔲 | 🔲 | 🔲 |
| Tab bar navigasyonu | 🔲 | 🔲 | 🔲 |
| Dark/Light mod | 🔲 | 🔲 | 🔲 |
| Push bildirimleri | 🔲 | 🔲 | N/A |
