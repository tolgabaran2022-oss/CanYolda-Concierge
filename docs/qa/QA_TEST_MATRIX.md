# CanYoldaşı — QA Test Matrisi

> Tarih: 16 Temmuz 2026 | QA Turu: 1.0
> Durum: ✅ GEÇTİ | ❌ BAŞARISIZ | ⚠️ KISMI | 🔲 TEST EDİLMEDİ

---

## T-01: Kimlik Doğrulama

| ID | Test Senaryosu | Yöntem | Sonuç | Not |
|----|----------------|--------|-------|-----|
| T-01-1 | Geçerli e-posta/şifre ile kayıt | API | ✅ | 201 Created |
| T-01-2 | Duplicate e-posta ile kayıt | API | ✅ | 409 döndü |
| T-01-3 | Geçerli giriş | API | ✅ | JWT token döndü |
| T-01-4 | Yanlış şifre girişi | API | ✅ | 401 döndü |
| T-01-5 | Süresi dolmuş token ile erişim | API | 🔲 | — |
| T-01-6 | Şifre sıfırlama akışı (3 adım) | API | ✅ | Aynı yanıt (leak yok) |
| T-01-7 | forgot-password kullanıcı enumeration | API | ✅ | Aynı mesaj döndü |
| T-01-8 | Profil güncelleme (avatar) | API | 🔲 | — |

## T-02: Sokak Hayvanları

| ID | Test Senaryosu | Yöntem | Sonuç | Not |
|----|----------------|--------|-------|-----|
| T-02-1 | Hayvan listesi GET | API | ✅ | 11 hayvan döndü |
| T-02-2 | Hayvan oluştur (Bearer) | API | ✅ | 201 Created |
| T-02-3 | Hayvan güncelle (sahip) | API | 🔲 | — |
| T-02-4 | Hayvan sil (sahip) | API | ✅ | Silindi |
| T-02-5 | Hayvan sil (başkası) | API | ✅ | 403 Forbidden |
| T-02-6 | Yakın hayvanlar | API | ✅ | data.nearby ✓ |
| T-02-7 | Beslendi toggle | API | 🔲 | — |
| T-02-8 | Yardım gerekiyor toggle | API | 🔲 | — |
| T-02-9 | Yorum ekle | API | 🔲 | — |
| T-02-10 | Fotoğraf yükleme + URL kaydetme | API | ✅ | Upload sonrası URL |

## T-03: Mesajlaşma

| ID | Test Senaryosu | Yöntem | Sonuç | Not |
|----|----------------|--------|-------|-----|
| T-03-1 | Konuşma oluştur (T1→T2) | API | ✅ | UUID döndü |
| T-03-2 | Konuşmaları listele | API | ✅ | Bearer ile 200 |
| T-03-3 | Mesaj gönder | API | ✅ | Mesaj kaydedildi |
| T-03-4 | Mesajları listele | API | ✅ | — |
| T-03-5 | Okundu işareti | API | ✅ | — |
| T-03-6 | Kimlik doğrulamasız erişim | API | ✅ | 401 |
| T-03-7 | Mesaj polling (3s) | Manuel | 🔲 | — |

## T-04: Sahiplendirme

| ID | Test Senaryosu | Yöntem | Sonuç | Not |
|----|----------------|--------|-------|-----|
| T-04-1 | İlan listesi | API | ✅ | 13 ilan döndü |
| T-04-2 | İlan oluştur | API | 🔲 | — |
| T-04-3 | İlan sil (sahip) | API | 🔲 | — |
| T-04-4 | İlan sil (başkası) | API | ✅ | 403 Forbidden |
| T-04-5 | Kimlik doğrulamasız ilan oluştur | API | ✅ | 401 |
| T-04-6 | Filtreleme | Manuel | 🔲 | — |
| T-04-7 | Boost aktifleştirme | API | 🔲 | RevenueCat gerekli |

## T-05: Feed / Sosyal

| ID | Test Senaryosu | Yöntem | Sonuç | Not |
|----|----------------|--------|-------|-----|
| T-05-1 | Feed GET (anonim) | API | ✅ | 10 gönderi |
| T-05-2 | Gönderi oluştur | API | ✅ | ID döndü |
| T-05-3 | Beğeni toggle (Bearer) | API | ✅ | liked:true/false |
| T-05-4 | Yer imi toggle (Bearer) | API | ✅ | bookmarked:true |
| T-05-5 | Yer imleri listele (Bearer) | API | ✅ | 1 döndü |
| T-05-6 | Yorum ekle (Bearer) | API | ✅ | ID döndü |
| T-05-7 | Başkasının gönderisini sil | API | 🔲 | — |
| T-05-8 | Takip/takipten çık idempotent | API | ✅ | toggle çalışıyor |
| T-05-9 | Takip sayaçları | API | ✅ | followers:1 |
| T-05-10 | Takip akışı (following mode) | API | 🔲 | — |

## T-06: Evcil Hayvan Yönetimi

| ID | Test Senaryosu | Yöntem | Sonuç | Not |
|----|----------------|--------|-------|-----|
| T-06-1 | Pet listesi (Bearer) | API | ✅ | 1 pet döndü |
| T-06-2 | Aşı kaydı oluştur | API | ✅ | ID döndü |
| T-06-3 | Randevu oluştur | API | 🔲 | — |
| T-06-4 | Pet sil (başkası) | API | 🔲 | — |

## T-07: Güvenlik

| ID | Test Senaryosu | Yöntem | Sonuç | Not |
|----|----------------|--------|-------|-----|
| T-07-1 | IDOR: hayvan silme | API | ✅ | 403 |
| T-07-2 | IDOR: ilan silme | API | ✅ | 403 |
| T-07-3 | Auth bypass | API | ✅ | 401 |
| T-07-4 | User enumeration | API | ✅ | Aynı yanıt |
| T-07-5 | priorityScore spoofing | API | ✅ | Sunucu hesaplıyor |
| T-07-6 | SQL injection | Analiz | ✅ | Drizzle ORM |
