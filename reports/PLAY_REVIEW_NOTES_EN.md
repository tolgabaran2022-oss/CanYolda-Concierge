# CanYoldaşı — Google Play Review Notes (English)
**Date:** July 20, 2026  
**Enter the following in Google Play Console → App content → App access.**

---

## App Purpose

CanYoldaşı ("Soul Companion") is a community-driven mobile app for reporting, tracking, and managing adoption listings for stray animals in Turkey. The app is available in Turkish and English.

---

## Demo Account (App Access)

To access all app features:

> **Email:** demo@canyoldasi.app  
> **Password:** DemoReview2026!  
> **Status:** Premium subscriber (all features unlocked)

*(Please create and verify this account before submission.)*

---

## Restricted Features (Premium)

The following features require an **Evcilim Premium** subscription:
- Adding a second (and subsequent) pet
- Uploading pet documents
- Medication tracking
- AI Pet Assistant

**The demo account has Premium active — all these features are accessible.**

---

## Feature Access Steps

### Stray Animal Map
Open app → First tab (Map) → Animal reports shown around Istanbul. Tap a marker to view details. Use "+" to report a new stray (requires location + photo).

### Adoption Listings
Second tab → Browse listings → Tap a listing → Details + "Send Message". Use "+" to create a listing.

### Pets (Evcilim)
Third tab → Lists registered pets. First pet is free. Second+ pets require Evcilim Premium. Demo account already has Premium active.

### Evcilim Premium Purchase
Third tab → "+" (second pet) OR pet detail → Documents → Premium screen opens. Choose Monthly or Annual plan.

### Listing Boost
Open an adoption listing → "Boost Listing" → Choose a boost package (Google Play In-App Purchase).

### Account & Settings
Fourth tab → Profile editing, password change, privacy policy, terms of service, **account deletion**.

---

## Permissions Justification

| Permission | Why Required |
|---|---|
| ACCESS_FINE_LOCATION | Pin location of stray animals on map; show nearby animals |
| ACCESS_COARSE_LOCATION | Fallback location for map features |
| CAMERA | Take photos of animals, upload pet/profile/document photos |
| VIBRATE | Haptic feedback for app interactions |
| INTERNET | All network requests to backend API |
| BILLING | In-app subscription and boost purchases via RevenueCat |

Permissions are requested only when a relevant feature is first used. Denying a permission disables only the related feature; the rest of the app continues normally.

---

## Restore Purchases

Tap "Restore Purchases" at the bottom of the Evcilim Premium screen. Any prior Google Play subscription linked to the same Google account will be restored.

---

## Account Deletion

1. Fourth tab → Account (Hesap)
2. Scroll down → "Delete Account" (Hesabı Sil)
3. Enter password → Confirm
4. All user data is permanently deleted

**Web URL for account deletion:** `https://[REPLIT_DOMAIN]/account-delete` *(required for Play Store compliance — ensure this URL resolves before submission)*

---

## Data Safety Summary

| Data Type | Collected | Shared | Encrypted | Deletion |
|---|---|---|---|---|
| Name / Email / Phone | Yes | No | Yes (TLS) | Yes (account delete) |
| Precise location | Yes (optional) | No | Yes | Yes |
| Photos | Yes | No | Yes | Yes |
| Purchase history | Yes (RevenueCat) | RevenueCat | Yes | Yes |
| Messages | Yes | No | Yes | Yes |

---

## Backend Availability

The backend server will remain active throughout the review period:  
`https://[REPLIT_DOMAIN]/api`

Support: support@canyoldasi.app
