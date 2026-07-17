---
name: Password reset architecture
description: Link-based password reset flow — token generation, endpoints, mobile screens
---

## Flow (link-based, replaced OTP)

1. `POST /api/auth/forgot-password`
   - Generates `randomBytes(32).toString('hex')` raw token
   - Stores SHA-256 hash in `password_reset_tokens` table (30-min TTL)
   - Sends link email via Resend using `PASSWORD_RESET_FROM_EMAIL` env var
   - Link URL: `PASSWORD_RESET_BASE_URL?token=<rawToken>` (falls back to `REPLIT_EXPO_DEV_DOMAIN/(auth)/reset-password` in dev, or `canyoldasimapp.com/reset-password` in prod)
   - 60s resend cooldown checked in `password_reset_tokens`
   - Rate limits: 5 req/15min per IP (express-rate-limit)
   - Generic response for unknown emails (no enumeration)

2. `GET /api/auth/reset-password/verify?token=...`
   - Hashes incoming token, looks up in `password_reset_tokens`
   - Returns `{ valid: true }` or `{ valid: false, reason: "expired"|"used"|"not_found" }`

3. `POST /api/auth/reset-password`
   - Body: `{ token, newPassword, confirmPassword }`
   - Validates passwords match + strength (upper+lower+digit+special+8chars)
   - Hashes token, finds record, checks not used/expired
   - Updates `localUsers.passwordHash`, marks token used, invalidates other open tokens

## DB tables

- `password_reset_tokens`: `id, user_id, token_hash (UNIQUE), expires_at, used_at, created_at, requested_ip, user_agent`
- `password_reset_codes`: legacy OTP table (kept, not used in new flow)

## Mobile screens

- `/(auth)/forgot-password.tsx`: shows success card (email sent) on success; "Tekrar Gönder" with 60s cooldown; does NOT navigate to reset-password
- `/(auth)/reset-password.tsx`: accepts `token` from `useLocalSearchParams`; verifies on mount; shows loading/valid-form/expired/used/error states; submits `{ token, newPassword, confirmPassword }`

## Env vars

- `RESEND_API_KEY` — required for email sending
- `PASSWORD_RESET_FROM_EMAIL` — sender address (falls back to `noreply@canyoldasimapp.com`)
- `PASSWORD_RESET_BASE_URL` — override reset link base URL; auto-detected from `REPLIT_EXPO_DEV_DOMAIN` in dev

**Why link-based:** More secure than OTP (tokens are SHA-256 hashed, single-use, 30-min TTL, no brute-force risk); better UX (one click from email); standard industry pattern.
