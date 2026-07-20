# CanYoldaşı — Security & API Authorization Audit
**Tarih:** 20 Temmuz 2026

Not: Uygulama Supabase kullanmıyor; kendi PostgreSQL + Express + Drizzle ORM altyapısı var. RLS bu bağlamda API middleware kontrolü anlamına gelir.

---

## Özet

| Bulgu | Önem | Durum |
|---|---|---|
| x-user-id header bypass | P0 | **PASS — kapalı** |
| Unauthenticated pet/adoption operations | P0 | **PASS — 401** |
| Pet ownership enforcement | P0 | **PASS — 403** |
| Adoption ownership enforcement | P0 | **PASS — 403** |
| Animal report ownership | P0 | **PASS — 403** |
| Premium bypass (2. hayvan) | P1 | **PASS — PET_PREMIUM_REQUIRED** |
| Rate limiting (auth/upload/general) | P1 | **PASS** |
| JWT secret from env | P0 | **PASS** |
| RC secret key server-only | P0 | **PASS** |
| Server-side console.log (log PII) | P1 | **PASS — hiç yok** |
| Webhook idempotency | P1 | **PASS — revenuecat_webhook_events** |
| Account deletion password confirm | P0 | **PASS** |
| POST_NOTIFICATIONS missing (Android) | P2 | **OPEN** |
| FACEBOOK env vars undefined use | P2 | **OPEN — kaldırılmalı veya belgelenmeli** |

---

## Kimlik Doğrulama Mimarisi

**Yöntem:** JWT (HS256)  
**Secret:** `process.env.JWT_SECRET` (env var — production'da set edilmeli)  
**Token ömrü:** 30 gün  
**Depolama (client):** AsyncStorage  
**Middleware:** `extractUserId(req)` — Bearer token'dan `sub` claim'ini çıkarır

### x-user-id Güvenliği

```typescript
// artifacts/api-server/src/lib/jwtAuth.ts
// x-user-id headers are intentionally ignored and never accepted
```

Önceki migrasyonda `extractUserIdDual` kaldırılmış, artık yalnızca JWT tabanlı kimlik doğrulaması geçerli. **PASS.**

---

## Endpoint Yetki Matrisi

### Pets (`/api/pets`)

| İşlem | Yetki Kontrolü | Sonuç |
|---|---|---|
| GET /pets (kendi) | `extractUserId` → ownerId = userId | **PASS** |
| GET /pets/user/:userId (başka) | Public read | Tasarım gereği |
| POST /pets | Auth + pet premium count check | **PASS** |
| PATCH /pets/:id | Auth + `ownerId !== userId → 403` | **PASS** |
| DELETE /pets/:id | Auth + `ownerId !== userId → 403` | **PASS** |
| Unauthenticated DELETE | 401 | **PASS** (curl doğrulandı) |

### Adoption Listings (`/api/adoption`)

| İşlem | Yetki Kontrolü | Sonuç |
|---|---|---|
| GET listings | Public read | Tasarım gereği |
| POST listing | Auth required | **PASS** |
| PATCH /adoption/:id | Auth + `userId !== listing.userId → 403` | **PASS** |
| DELETE /adoption/:id | Auth + `userId !== listing.userId → 403` | **PASS** |
| Unauthenticated DELETE | 401 | **PASS** (curl doğrulandı) |

### Animals (`/api/animals`)

| İşlem | Yetki Kontrolü | Sonuç |
|---|---|---|
| GET animals | Public read | Tasarım gereği |
| POST animal | Auth required | **PASS** |
| PATCH /animals/:id | Auth + `userId !== existing.userId → 403` | **PASS** |
| DELETE /animals/:id | Auth + ownership | **PASS** |
| Comment delete | Auth + `comment.userId !== userId → 403` | **PASS** |
| Moderatör durumu | Moderatör kontrolü | **STATIC REVIEW** |

### Auth Routes

| İşlem | Koruma | Sonuç |
|---|---|---|
| POST /auth/register | authLimiter (10/15min) + Zod validation | **PASS** |
| POST /auth/login | authLimiter | **PASS** |
| DELETE /auth/account | Bearer JWT + bcrypt şifre doğrulama | **PASS** |
| POST /auth/forgot-password | passwordResetLimiter (5/hr) | **PASS** |

---

## Rate Limiting

| Endpoint Grubu | Limit | Pencere |
|---|---|---|
| Auth (login/register) | 10 istek | 15 dakika |
| Şifre sıfırlama | 5 istek | 1 saat |
| Resim yükleme | 20 istek | 1 dakika |
| İçerik oluşturma | 30 istek | 10 dakika |
| Promosyon/RC | 20 istek | 10 dakika |
| Mesajlaşma | 60 istek | 1 dakika |
| Genel API | 300 istek | 1 dakika |

**Uygulama:** IP tabanlı, in-memory (tek process). Multi-instance deployment için Redis store gerekir.

---

## Premium Gate (İkinci Hayvan)

Curl ile doğrulandı:

1. Ücretsiz kullanıcı, 1 hayvan var → 2. hayvan isteği
2. Yanıt: `{"code":"PET_PREMIUM_REQUIRED"}` 
3. Backend doğru davranıyor: **PASS**

Premium bypass için doğrudan `/evcilim/add` route'una gidilse bile backend `petPremiumAccess` tablosunu kontrol eder.

---

## Webhook Güvenliği

RevenueCat webhook (`/api/webhooks/revenuecat`):
- `REVENUECAT_WEBHOOK_AUTH_TOKEN` ile Bearer auth
- Opsiyonel HMAC imzalama (`REVENUECAT_WEBHOOK_SIGNING_SECRET`)
- `revenuecat_webhook_events` tablosunda idempotency kontrolü
- Raw body JSON parse'dan önce işleniyor

**Durum:** STATIC REVIEW — PASS

---

## Veri Sızıntısı Riski

| Risk | Durum |
|---|---|
| Server-side console.log | **PASS** — hiç yok (req.log/logger kullanılıyor) |
| Authorization header loglanması | **PASS** — jwtAuth.ts'de açıkça atlanıyor |
| Secret env var client'ta | **PASS** — REVENUECAT_SECRET_API_KEY sadece server |
| JWT token loglanması | **PASS** — middleware loglamıyor |

---

## Açık Güvenlik Maddeleri

### OPEN-SEC-01 · FACEBOOK Env Vars (P2)

`FACEBOOK_APP_ID` ve `FACEBOOK_APP_SECRET` server env'de tanımlı ama kullanılmıyor. Kaldırılmalı veya kullanılan yer belgelenmeli.

### OPEN-SEC-02 · POST_NOTIFICATIONS Android 13+ (P0 yan etki)

Push notification altyapısı eklendiğinde bu iznin eklenmesi gerekecek.

### OPEN-SEC-03 · JWT Secret Güçlülüğü (P2)

`JWT_SECRET` env var değerinin üretimde yeterli uzunlukta ve rastgele olduğundan emin olunmalı (min 64 karakter, CSPRNG üretimi). Kontrol edilmedi.

### OPEN-SEC-04 · bcrypt Round Sayısı (P3)

Auth routes bcrypt kullanıyor. Round sayısı (default 10) üretimde yeterli; ancak doğrulanmadı.
