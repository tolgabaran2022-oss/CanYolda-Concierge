export default function Slide03Cozum() {
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
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>03 / 10</span>
      </div>

      {/* Two-column layout */}
      <div className="absolute flex" style={{ top: "14vh", left: "5vw", right: "5vw", bottom: "10vh", gap: "5vw" }}>
        {/* Left: headline */}
        <div style={{ flex: "0 0 36vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
          <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#3B6E8C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
            Çözüm
          </p>
          <h2 style={{ fontSize: "5vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: "3vh", textWrap: "balance" }}>
            Tek uygulama, üç süreç.
          </h2>
          <p style={{ fontSize: "2vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.6, textWrap: "pretty" }}>
            Hayvanları bil, takip et, sahiplendir. Topluluk gücüyle her yerde, her zaman.
          </p>
        </div>

        {/* Right: steps */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "3vh" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.8vh 2.5vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)", display: "flex", alignItems: "flex-start", gap: "2vw" }}>
            <span style={{ fontSize: "3.5vw", fontWeight: 700, color: "#3B6E8C", lineHeight: 1, flexShrink: 0 }}>1</span>
            <div>
              <p style={{ fontSize: "2.3vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Haritada bildir</p>
              <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>
                Fotoğraf çek, konum sabitle, durum işaretle.
              </p>
            </div>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.8vh 2.5vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)", display: "flex", alignItems: "flex-start", gap: "2vw" }}>
            <span style={{ fontSize: "3.5vw", fontWeight: 700, color: "#3B6E8C", lineHeight: 1, flexShrink: 0 }}>2</span>
            <div>
              <p style={{ fontSize: "2.3vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Toplulukla takip et</p>
              <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>
                Durum güncellemeleri, yorum ve beslendi işaretleri.
              </p>
            </div>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.8vh 2.5vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)", display: "flex", alignItems: "flex-start", gap: "2vw" }}>
            <span style={{ fontSize: "3.5vw", fontWeight: 700, color: "#3B6E8C", lineHeight: 1, flexShrink: 0 }}>3</span>
            <div>
              <p style={{ fontSize: "2.3vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Sahiplendir</p>
              <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>
                İlan oluştur, ilgilenenlere doğrudan ulaş.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
