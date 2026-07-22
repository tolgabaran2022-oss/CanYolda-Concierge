export default function Slide03Cozum() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.5vh", background: "#d4af37" }} />

      {/* Subtle left gold glow */}
      <div
        className="absolute"
        style={{
          top: "20vh",
          left: "-5vw",
          width: "40vw",
          height: "60vh",
          background: "radial-gradient(ellipse at left, rgba(212,175,55,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">03 / 10</span>
      </div>

      {/* Two-column layout */}
      <div className="absolute flex" style={{ top: "15vh", left: "5vw", right: "5vw", bottom: "10vh", gap: "4vw" }}>
        {/* Left: headline */}
        <div style={{ flex: "0 0 38vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
            Çözüm
          </p>
          <h2 style={{ fontSize: "5vw", fontWeight: 700, color: "#f8f9fa", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "1.2vh", textWrap: "balance" }}>
            Tek uygulama,
          </h2>
          <h2 style={{ fontSize: "5vw", fontWeight: 700, color: "#d4af37", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "2vh", textWrap: "balance" }}>
            üç güçlü süreç.
          </h2>
          <span className="gold-rule" />
          <p style={{ fontSize: "2vw", color: "#a0a0a0", lineHeight: 1.6, marginTop: "3vh", textWrap: "pretty" }}>
            Hayvanları bil, takip et, sahiplendir. Topluluk gücüyle her yerde, her zaman.
          </p>
        </div>

        {/* Right: three process steps */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.5vh" }}>
          {/* Step 1 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "2vw" }}>
            <div style={{
              flexShrink: 0,
              width: "5vw", height: "5vw",
              borderRadius: "50%",
              background: "rgba(212,175,55,0.15)",
              border: "0.2vh solid #d4af37",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "2.4vw", fontWeight: 700, color: "#d4af37" }}>1</span>
            </div>
            <div>
              <p style={{ fontSize: "2.6vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.5vh" }}>Haritada bildir</p>
              <p style={{ fontSize: "1.9vw", color: "#a0a0a0", lineHeight: 1.5 }}>
                Fotoğraf çek, konum sabitle, durum işaretle — saniyeler içinde.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "2vw" }}>
            <div style={{
              flexShrink: 0,
              width: "5vw", height: "5vw",
              borderRadius: "50%",
              background: "rgba(212,175,55,0.15)",
              border: "0.2vh solid #d4af37",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "2.4vw", fontWeight: 700, color: "#d4af37" }}>2</span>
            </div>
            <div>
              <p style={{ fontSize: "2.6vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.5vh" }}>Toplulukla takip et</p>
              <p style={{ fontSize: "1.9vw", color: "#a0a0a0", lineHeight: 1.5 }}>
                Durum güncellemeleri, yorum ve beslendi işaretleri — geçmiş kayıt altında.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "2vw" }}>
            <div style={{
              flexShrink: 0,
              width: "5vw", height: "5vw",
              borderRadius: "50%",
              background: "rgba(212,175,55,0.15)",
              border: "0.2vh solid #d4af37",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "2.4vw", fontWeight: 700, color: "#d4af37" }}>3</span>
            </div>
            <div>
              <p style={{ fontSize: "2.6vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.5vh" }}>Sahiplendir</p>
              <p style={{ fontSize: "1.9vw", color: "#a0a0a0", lineHeight: 1.5 }}>
                Sahiplendirme ilanı oluştur, ilgilenenlere doğrudan ulaş.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
