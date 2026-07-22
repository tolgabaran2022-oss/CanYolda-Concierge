export default function Slide09Magaza() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#F7F6F3", fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Teal left sidebar strip */}
      <div className="absolute top-0 left-0 bottom-0" style={{ width: "0.5vw", background: "#3B6E8C" }} />

      {/* Brand mark */}
      <div className="absolute" style={{ top: "4.5vh", left: "4vw" }}>
        <span style={{ fontSize: "1.4vw", fontWeight: 700, color: "#3B6E8C", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          CanYoldaşı
        </span>
      </div>

      {/* Page number */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>09 / 10</span>
      </div>

      {/* Content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
        <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#3B6E8C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
          Mağaza Hazırlığı
        </p>
        <h2 style={{ fontSize: "4.6vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: "4vh", textWrap: "balance" }}>
          App Store + Google Play — lansmanına hazır.
        </h2>

        {/* 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vh 2.5vw" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)", display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <span style={{ fontSize: "2.5vw", fontWeight: 700, color: "#3B6E8C", flexShrink: 0, lineHeight: 1, marginTop: "0.2vh" }}>+</span>
            <div>
              <p style={{ fontSize: "2.1vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Kapsamlı QA</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>Kimlik doğrulama, premium akış, mesajlaşma ve harita — tam test kapsamı.</p>
            </div>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)", display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <span style={{ fontSize: "2.5vw", fontWeight: 700, color: "#3B6E8C", flexShrink: 0, lineHeight: 1, marginTop: "0.2vh" }}>+</span>
            <div>
              <p style={{ fontSize: "2.1vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Tam dil desteği</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>Türkçe ve İngilizce — i18n altyapısı tamamlandı.</p>
            </div>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)", display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <span style={{ fontSize: "2.5vw", fontWeight: 700, color: "#3B6E8C", flexShrink: 0, lineHeight: 1, marginTop: "0.2vh" }}>+</span>
            <div>
              <p style={{ fontSize: "2.1vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Gizlilik & Güvenlik</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>GDPR uyumlu hesap silme, veri gizliliği, MIME tipi kontrolü.</p>
            </div>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)", display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
            <span style={{ fontSize: "2.5vw", fontWeight: 700, color: "#3B6E8C", flexShrink: 0, lineHeight: 1, marginTop: "0.2vh" }}>+</span>
            <div>
              <p style={{ fontSize: "2.1vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>EAS Build Hazır</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>Android App Bundle + iOS IPA — mağaza gönderim yapılandırması tamamlandı.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
