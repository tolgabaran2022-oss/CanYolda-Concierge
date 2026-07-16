# CanYoldaşı — Hata Raporu

> Tarih: 16 Temmuz 2026 | QA Turu: 1.0

## Durum Açıklaması
- 🔴 **KRİTİK** — Release blocker, üretime geçilemez
- 🟠 **YÜKSEK** — Temel özellik çalışmıyor
- 🟡 **ORTA** — Özellik çalışıyor ama eksik/hatalı
- 🟢 **DÜŞÜK** — Kozmetik veya küçük sorun
- ✅ **DÜZELTİLDİ** — Bu QA turunda giderildi

---

## DÜZELTİLEN HATALAR

### BUG-001 ✅ KRİTİK — Çift Prefix Routing
**Etki:** Mesajlaşma, Boost, Promotions route'ları tamamen erişilemez  
**Kök Neden:** `index.ts`'de `router.use("/messages", messagesRouter)` + `messages.ts`'de `/messages/conversations` → `/api/messages/messages/conversations`  
**Düzeltme:** Route dosyalarındaki iç prefix'ler kaldırıldı (`/messages/conversations` → `/conversations`), `index.ts`'deki prefix'ler korundu  
**Test:** `GET /api/messages/conversations` → 200 ✓ | `GET /api/boost/packages` → 200 ✓ | `POST /api/promotions/verify-purchase` → 400 (validation, erişim ✓)

---

### BUG-002 ✅ KRİTİK — Mesajlaşma Bearer Token Yerine x-user-id Kullanıyordu
**Etki:** `messagesApi.ts` tüm API çağrılarında `x-user-id: user.id` gönderiyordu; sunucu yalnızca Bearer JWT kabul ediyordu → tüm mesaj işlemleri 401 dönüyordu  
**Etkilenen Dosyalar:** `lib/messagesApi.ts` + 5 screen (messages/index, [conversationId], adoption.tsx, adoption/[id], user-profile/[userId])  
**Düzeltme:** `messagesApi.ts` Bearer token kullanacak şekilde yeniden yazıldı; tüm call site'larda `user.id` → `token` değiştirildi  
**Test:** `POST /api/messages/conversations` → 200 ✓ | Mesaj gönderme → 200 ✓

---

### BUG-003 ✅ KRİTİK — Feed & Stories Endpoint'leri x-user-id Auth Hatası
**Etki:** Feed beğeni, yorum, yer imi, gönderi oluşturma, hikaye beğeni/görüntüleme — hepsi `x-user-id` header'ı bekliyordu; mobil uygulama Bearer token gönderiyordu → 401/400 hataları  
**Etkilenen Dosyalar:** `routes/feed.ts` (8 endpoint), `routes/stories.ts` (4 endpoint)  
**Düzeltme:** `jwtAuth.ts`'e `extractUserIdDual()` helper'ı eklendi (Bearer JWT → fallback x-user-id); tüm feed/stories endpoint'leri güncellendi  
**Test:** Feed beğeni Bearer ile → 200 ✓ | Yorum Bearer ile → 200 ✓ | Yer imi GET Bearer ile → 200 ✓

---

### BUG-004 ✅ YÜKSEK — Rate Limiter Tüm Route'lara Uygulandı
**Etki:** `router.use(promotionLimiter, boostRouter)` (prefix olmadan) → promotionLimiter TÜM isteklere uygulandı → `/api/pets`, `/api/animals`, bildirimler vb. "Çok fazla promosyon isteği" 429 hatası döndü  
**Kök Neden:** BUG-001 düzeltmesi sırasında prefix kaldırılırken rate limiter middleware da prefix'siz bırakıldı  
**Düzeltme:** `router.use("/boost", promotionLimiter, boostRouter)` prefix'i geri eklendi  
**Test:** `/api/pets` → 200 ✓ | `/api/animals` → 200 ✓ | `/api/boost/packages` → 200 ✓

---

### BUG-005 ✅ ORTA — Animals Nearby Endpoint Hatalı Data Parsing
**Etki:** `/api/animals/nearby` yanıtı `{ nearby: [], count: N }` formatında dönerken mobil `data.animals` kullanıyordu → haritada yakın hayvanlar görünmüyordu  
**Düzeltme:** Mobile tarafında `data.animals` → `data.nearby` olarak güncellendi  
**Test:** Nearby endpoint → `{ nearby: [...] }` ✓

---

### BUG-006 ✅ ORTA — Fotoğraf Yükleme: Local URI Doğrudan API'ye Gönderiliyordu
**Etki:** ImagePicker `file://` URI döndürürken birden fazla ekran bunu doğrudan `imageUrl` olarak kaydediyordu → sunucuda erişilemeyen URL'ler depolandı  
**Etkilenen Dosyalar:** add-animal.tsx (+ 5 başka ekran — önceki QA turunda düzeltildi)  
**Düzeltme:** `uploadImage(/api/upload)` önce çağrılıyor, dönen URL kaydediliyor  
**Test:** Hayvan ekleme → sunucu URL kaydediliyor ✓

---

## AÇIK HATALAR

### BUG-007 🟡 ORTA — Sosyal Kullanıcı Arama Boş Sonuç Döndürüyor
**Etki:** `GET /api/social/users?q=QA` → `[]` dönüyor; QA test kullanıcıları aramada görünmüyor  
**Kök Neden:** Arama, `social_profiles` tablosuna bakıyor; QA kullanıcıları `social_profiles`'a eklenmiş ama `username` alanı henüz eşleşmiyor olabilir  
**Repro:** Bearer token ile `GET /api/social/users?q=qa_test` çağrısı  
**Geçici Çözüm:** Kullanıcı profil sayfasını açarak social_profiles güncellenebilir  
**Öneri:** Kayıt sırasında `social_profiles` kaydı otomatik oluşturulmalı  

---

### BUG-008 🟡 ORTA — Hikayeler Boş (Stories Feed Boş)
**Etki:** `GET /api/stories` → `[]`; Story tab'ı içerik göstermiyor  
**Kök Neden:** Seed verisi yok; hikayeler yalnızca gerçek kullanıcı yüklemesiyle oluşuyor  
**Not:** Stories özelliği teknik olarak çalışıyor (view/like endpoint'leri ✓), ancak başlangıç içeriği yok  

---

### BUG-009 🟢 DÜŞÜK — Feed Gönderi Oluşturma: userId Body'den Geliyor
**Etki:** `POST /api/feed/posts` body'deki `userId`'yi kabul ediyor → teorik olarak başka kullanıcı adına gönderi oluşturulabilir  
**Not:** `extractUserIdDual` ile `authId` artık kullanılıyor (düzeltildi), ancak eski mobil kod hâlâ body'de `userId` gönderiyor — bu artık yok sayılıyor  
**Durum:** Server tarafı düzeltildi; mobil uyumlu  

---

### BUG-010 🟢 DÜŞÜK — mockup-sandbox TypeScript Hataları (Önceden Var)
**Etki:** `artifacts/mockup-sandbox` typecheck başarısız; `calendar.tsx` ve `spinner.tsx`'de React ref tip uyumsuzlukları  
**Not:** Bu artifact üretim uygulamasının bir parçası değil (Canvas geliştirme aracı); release'i etkilemez  

---

## GÜVENLİK TESTLERİ ÖZETI

| Test | Sonuç |
|------|-------|
| T2 → T1'in hayvanını silemez | ✅ 403 Forbidden |
| T2 → T1'in ilanını silemez | ✅ 403 Forbidden |
| Kayıtsız ilan oluşturulamaz | ✅ 401 Unauthorized |
| forgot-password kullanıcı enumeration | ✅ Aynı yanıt (leak yok) |
| SQL injection (Drizzle ORM) | ✅ Parametrize sorgular |
| JWT olmadan mesaj okunamaz | ✅ 401 |
| priorityScore client'tan set edilemiyor | ✅ Sunucu hesaplıyor |
