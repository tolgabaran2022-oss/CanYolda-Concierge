export default function Slide06IsModeli() {
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
        <span className="page-num">06 / 10</span>
      </div>

      {/* Main content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1vh" }}>
          İş Modeli
        </p>
        <h2 style={{ fontSize: "4.8vw", fontWeight: 700, color: "#f8f9fa", letterSpacing: "-0.02em", lineHeight: 1.08, marginBottom: "1.5vh", textWrap: "balance" }}>
          Freemium + <span style={{ color: "#d4af37" }}>Premium</span> abonelik
        </h2>
        <span className="gold-rule" style={{ marginBottom: "3.5vh" }} />

        {/* Two tiers + future row */}
        <div style={{ display: "flex", gap: "3vw", marginTop: "2vh" }}>
          {/* Free tier */}
          <div style={{
            flex: 1,
            background: "#1a1a1a",
            borderRadius: "1vw",
            padding: "3.5vh 2.5vw",
            border: "0.15vw solid #2a2a2a",
          }}>
            <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#a0a0a0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              Ücretsiz
            </p>
            <p style={{ fontSize: "2.8vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "2.5vh" }}>Herkes için temel</p>
            <div style={{ borderTop: "0.15vh solid #2a2a2a", paddingTop: "2vh" }}>
              <p style={{ fontSize: "1.9vw", color: "#c0c0c0", lineHeight: 1.7 }}>1 evcil hayvan profili</p>
              <p style={{ fontSize: "1.9vw", color: "#c0c0c0", lineHeight: 1.7 }}>Sınırsız sokak bildirimi</p>
              <p style={{ fontSize: "1.9vw", color: "#c0c0c0", lineHeight: 1.7 }}>Sahiplendirme ilanı</p>
            </div>
          </div>

          {/* Premium tier */}
          <div style={{
            flex: 1,
            background: "linear-gradient(135deg, #1e1a0e 0%, #1a1a1a 100%)",
            borderRadius: "1vw",
            padding: "3.5vh 2.5vw",
            border: "0.2vw solid #d4af37",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", top: "-1.5vh", right: "2vw",
              background: "#d4af37", borderRadius: "0.4vw",
              padding: "0.4vh 1.2vw",
            }}>
              <p style={{ fontSize: "1.2vw", fontWeight: 700, color: "#111111" }}>RevenueCat IAP</p>
            </div>
            <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#d4af37", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              Premium
            </p>
            <p style={{ fontSize: "2.8vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "2.5vh" }}>Sahipler için tam güç</p>
            <div style={{ borderTop: "0.15vh solid rgba(212,175,55,0.2)", paddingTop: "2vh" }}>
              <p style={{ fontSize: "1.9vw", color: "#f0f0f0", lineHeight: 1.7 }}>Sınırsız evcil hayvan profili</p>
              <p style={{ fontSize: "1.9vw", color: "#f0f0f0", lineHeight: 1.7 }}>AI Hayvan Asistanı</p>
              <p style={{ fontSize: "1.9vw", color: "#f0f0f0", lineHeight: 1.7 }}>İlaç & belge yönetimi</p>
            </div>
          </div>

          {/* Future */}
          <div style={{
            flex: 1,
            background: "#1a1a1a",
            borderRadius: "1vw",
            padding: "3.5vh 2.5vw",
            border: "0.15vw solid #2a2a2a",
          }}>
            <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#a0a0a0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              Gelecek
            </p>
            <p style={{ fontSize: "2.8vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "2.5vh" }}>Genişleyen ekosistem</p>
            <div style={{ borderTop: "0.15vh solid #2a2a2a", paddingTop: "2vh" }}>
              <p style={{ fontSize: "1.9vw", color: "#c0c0c0", lineHeight: 1.7 }}>Boost — ilan öne çıkarma</p>
              <p style={{ fontSize: "1.9vw", color: "#c0c0c0", lineHeight: 1.7 }}>Veteriner iş birlikleri</p>
              <p style={{ fontSize: "1.9vw", color: "#c0c0c0", lineHeight: 1.7 }}>Belediye entegrasyonu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
