# CanYoldaşı — Release Blocker'ları

> Tarih: 16 Temmuz 2026 | QA Turu: 1.0

## Durum Özeti

| Öncelik | Toplam | Düzeltildi | Açık |
|---------|--------|------------|------|
| 🔴 KRİTİK | 4 | 4 | 0 |
| 🟠 YÜKSEK | 0 | 0 | 0 |
| 🟡 ORTA | 2 | 0 | 2 |

## ✅ Tüm Kritik Release Blocker'lar Giderildi

### RB-001 ✅ — Mesajlaşma Tamamen Erişilemez
Çift prefix routing (`/api/messages/messages/conversations`) → Düzeltildi.

### RB-002 ✅ — Mesaj API'si JWT Yerine x-user-id Kullandı
`messagesApi.ts` Bearer token kullanacak şekilde yeniden yazıldı; 5 screen güncellendi.

### RB-003 ✅ — Feed Beğeni/Yorum/Yer İmi Çalışmıyordu
`feed.ts` + `stories.ts` `extractUserIdDual()` ile güncellendi.

### RB-004 ✅ — Rate Limiter Tüm Route'lara Yanlışlıkla Uygulandı
`/api/pets`, `/api/animals` vb. 429 dönüyordu → Prefix restore edildi.

---

## Açık Orta Öncelikli Sorunlar (Release'i Engellemez)

### O-001 🟡 — Sosyal Kullanıcı Arama Sonuç Vermiyor
`/api/social/users?q=...` boş dönüyor; `social_profiles` otomatik oluşturulmuyor.  
**Etki:** Kullanıcı arama özelliği çalışmıyor.  
**Öneri:** Sonraki sürümde kayıt sırasında `social_profiles` kaydı otomatik oluşturulsun.

### O-002 🟡 — Hikayeler Boş
Başlangıç seed verisi yok; Stories feed tamamen boş görünüyor.  
**Etki:** Yeni kullanıcılara boş tab gösteriliyor.  
**Öneri:** Seed stories eklensin veya "Henüz hikaye yok" placeholder gösterilsin.

---

## Onay

Bu belge, QA turu 1.0 kapsamında yapılan manuel ve otomatik testlerin özetini içermektedir.  
Release için tüm kritik blocker'lar giderilmiştir.

**Release Kararı: ✅ ONAYLANDI** (O-001 ve O-002 sonraki sürüme bırakılabilir)
