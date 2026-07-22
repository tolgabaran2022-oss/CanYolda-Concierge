export default function Slide09Magaza() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.5vh", background: "#d4af37" }} />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">09 / 10</span>
      </div>

      {/* Main content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1vh" }}>
          Mağaza Hazırlığı
        </p>
        <h2 style={{ fontSize: "4.6vw", fontWeight: 700, color: "#f8f9fa", letterSpacing: "-0.02em", lineHeight: 1.08, marginBottom: "0.5vh", textWrap: "balance" }}>
          App Store + Google Play —
        </h2>
        <h2 style={{ fontSize: "4.6vw", fontWeight: 700, color: "#d4af37", letterSpacing: "-0.02em", lineHeight: 1.08, marginBottom: "1.5vh", textWrap: "balance" }}>
          lansmanına hazır.
        </h2>
        <span className="gold-rule" style={{ marginBottom: "3.5vh" }} />

        {/* Readiness checklist — 2x2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vh 3vw", marginTop: "2vh" }}>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, marginTop: "0.4vh" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", background: "rgba(212,175,55,0.2)", border: "0.2vh solid #d4af37", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1.3vw", color: "#d4af37", fontWeight: 700 }}>+</span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.5vh" }}>Kapsamlı QA</p>
              <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>Kimlik doğrulama, premium akış, mesajlaşma ve harita — tam test kapsamı.</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, marginTop: "0.4vh" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", background: "rgba(212,175,55,0.2)", border: "0.2vh solid #d4af37", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1.3vw", color: "#d4af37", fontWeight: 700 }}>+</span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.5vh" }}>Tam dil desteği</p>
              <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>Türkçe ve İngilizce — i18n altyapısı tamamlandı.</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, marginTop: "0.4vh" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", background: "rgba(212,175,55,0.2)", border: "0.2vh solid #d4af37", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1.3vw", color: "#d4af37", fontWeight: 700 }}>+</span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.5vh" }}>Gizlilik & Güvenlik</p>
              <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>GDPR uyumlu hesap silme, veri gizliliği, MIME tipi kontrolü.</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, marginTop: "0.4vh" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", background: "rgba(212,175,55,0.2)", border: "0.2vh solid #d4af37", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1.3vw", color: "#d4af37", fontWeight: 700 }}>+</span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.5vh" }}>EAS Build Hazır</p>
              <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>Android App Bundle + iOS IPA — mağaza gönderim yapılandırması tamamlandı.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
