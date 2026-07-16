# CanYoldaşı — Özellik Envanteri

> Tarih: 16 Temmuz 2026 | Sürüm: QA-1.0

## F-01: Kimlik Doğrulama (Auth)

| ID | Özellik | Açıklama |
|----|---------|----------|
| F-01-A | Kayıt | E-posta + şifre ile yeni hesap oluşturma |
| F-01-B | Giriş | JWT token alıp AsyncStorage'a kaydetme |
| F-01-C | Çıkış | Token silme, oturumu sonlandırma |
| F-01-D | Şifre sıfırlama | forgot-password → verify-reset-code → reset-password (3 adım) |
| F-01-E | Profil güncelleme | Avatar, kullanıcı adı, biyografi düzenleme |
| F-01-F | Hesap silme | Kullanıcı hesabını kalıcı silme |

## F-02: Sokak Hayvanları Haritası

| ID | Özellik | Açıklama |
|----|---------|----------|
| F-02-A | Harita görünümü | react-native-maps ile İstanbul merkezli harita |
| F-02-B | Renkli markerlar | Durum renkleri: aç(turuncu)/yaralı(kırmızı)/sağlıklı(yeşil)/bilinmiyor(gri) |
| F-02-C | Bildirim ekleme | Fotoğraf, konum, tür, durum, notlar ile yeni hayvan raporu |
| F-02-D | Fotoğraf yükleme | expo-image-picker → uploadImage → URL API'ye kaydediliyor |
| F-02-E | Fotoğraf doğrulama | /api/validate-image endpoint'i ile içerik denetimi |
| F-02-F | Hayvan güncelleme | Mevcut bildirimleri düzenleme |
| F-02-G | Hayvan silme | Yalnızca sahip silebilir |
| F-02-H | Yakın hayvanlar | /api/animals/nearby endpoint'i ile mesafe bazlı filtreleme |
| F-02-I | Duygu etkileşimleri | "Beslendi" / "Yardım gerekiyor" toggle |
| F-02-J | Yorumlar | Hayvana yorum ekleme/görüntüleme |
| F-02-K | Detay sayfası | Hayvan detay ekranı, geçmiş, etkileşimler |

## F-03: Evcil Hayvan Yönetimi

| ID | Özellik | Açıklama |
|----|---------|----------|
| F-03-A | Pet profili | Ad, tür, yaş, fotoğraf |
| F-03-B | Aşı kaydı | Aşı adı, tarih, sonraki tarih |
| F-03-C | Randevu | Veteriner randevu takibi |
| F-03-D | Kimlik | Çip no, pasaport bilgileri |
| F-03-E | Notlar | Sağlık notları |
| F-03-F | Beslenme | Beslenme programı |
| F-03-G | Pet silme | Yalnızca sahip silebilir |

## F-04: Sahiplendirme İlanları

| ID | Özellik | Açıklama |
|----|---------|----------|
| F-04-A | İlan listesi | Tüm ilanları görüntüleme |
| F-04-B | İlan oluşturma | Fotoğraf, ırk, yaş, konum, iletişim bilgileri |
| F-04-C | İlan düzenleme | Mevcut ilanları güncelleme |
| F-04-D | İlan silme | Yalnızca ilan sahibi silebilir |
| F-04-E | Filtreler | Tür, ırk, şehir, yaş, cinsiyet filtreleri |
| F-04-F | Arama | Metin ile ilan arama |
| F-04-G | Öne çıkarma (Boost) | RevenueCat IAP ile ilan öne çıkarma (3/7/30 gün) |
| F-04-H | İlan takibi | Beğenilen ilanları kaydetme |
| F-04-I | Mesaj gönder | İlan sahibine mesaj başlatma |

## F-05: Mesajlaşma

| ID | Özellik | Açıklama |
|----|---------|----------|
| F-05-A | Konuşma listesi | Tüm mesaj konuşmalarını görüntüleme |
| F-05-B | Mesaj gönder | Metin mesajı gönderme |
| F-05-C | Fotoğraf gönder | Fotoğraf mesajı gönderme |
| F-05-D | Okundu işareti | Mesajları okundu olarak işaretleme |
| F-05-E | Okunmamış sayacı | Tab'da okunmamış mesaj rozeti |
| F-05-F | Polling | 3 saniyede bir yeni mesaj kontrolü |

## F-06: Sosyal Özellikler / Feed

| ID | Özellik | Açıklama |
|----|---------|----------|
| F-06-A | Keşfet akışı | Herkese açık gönderi akışı |
| F-06-B | Takip akışı | Yalnızca takip edilenlerin gönderileri |
| F-06-C | Gönderi oluştur | Fotoğraf + başlık + konum ile gönderi |
| F-06-D | Beğeni | Gönderi beğenme/beğeniyi geri alma |
| F-06-E | Yorum | Gönderiye yorum ekleme/silme |
| F-06-F | Kaydet | Gönderiyi yer imlerine ekleme |
| F-06-G | Takip/takipten çık | Kullanıcı takip sistemi |
| F-06-H | Kullanıcı profili | Başka kullanıcıların profilini görüntüleme |
| F-06-I | Hikayeler | Gönderi hikayeleri (viewers, beğeni) |
| F-06-J | Bildirimler | Beğeni/yorum/takip bildirimleri |

## F-07: Para Kazanma / RevenueCat

| ID | Özellik | Açıklama |
|----|---------|----------|
| F-07-A | Boost paketleri | Hızlı(3gün)/Standart(7gün)/Premium(30gün) |
| F-07-B | IAP satın alma | RevenueCat ile uygulama içi satın alma |
| F-07-C | Webhook aktivasyonu | INITIAL_PURCHASE webhook ile ilan öne çıkarma |
| F-07-D | Öne çıkma durumu | İlanın aktif boost durumunu görüntüleme |

## F-08: Profil & Ayarlar

| ID | Özellik | Açıklama |
|----|---------|----------|
| F-08-A | Profil sayfası | Gönderi sayısı, takipçi/takip istatistikleri |
| F-08-B | Avatar güncelleme | Profil fotoğrafı değiştirme |
| F-08-C | Gizlilik ayarları | Profili gizli yapma |
| F-08-D | Bildirim ayarları | Beğeni/yorum bildirimlerini açma/kapama |
| F-08-E | Dark/Light mod | Tema değiştirme |
