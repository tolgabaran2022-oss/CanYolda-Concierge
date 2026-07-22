export default function Slide02Sorun() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.5vh", background: "#d4af37" }} />

      {/* Subtle background texture — dark amber glow bottom-right */}
      <div
        className="absolute"
        style={{
          bottom: "-10vh",
          right: "-10vw",
          width: "50vw",
          height: "60vh",
          background: "radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">02 / 10</span>
      </div>

      {/* Main content */}
      <div className="absolute" style={{ top: "15vh", left: "5vw", right: "5vw" }}>
        <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1vh" }}>
          Sorun
        </p>
        <h2 style={{ fontSize: "5.5vw", fontWeight: 700, color: "#f8f9fa", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: "0.5vh", textWrap: "balance" }}>
          Milyonlarca can,
        </h2>
        <h2 style={{ fontSize: "5.5vw", fontWeight: 700, color: "#d4af37", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: "1.5vh", textWrap: "balance" }}>
          görünmez ve takipsiz.
        </h2>
        <span className="gold-rule" style={{ marginBottom: "4.5vh" }} />

        {/* Three problem cards in a row */}
        <div className="flex gap-[2vw]" style={{ marginTop: "3vh" }}>
          {/* Card 1 */}
          <div
            style={{
              flex: 1,
              background: "#1a1a1a",
              borderRadius: "1vw",
              padding: "3vh 2.5vw",
              borderTop: "0.4vh solid #d4af37",
            }}
          >
            <p style={{ fontSize: "3.2vw", fontWeight: 700, color: "#d4af37", marginBottom: "1vh" }}>Koordinasyon yok</p>
            <p style={{ fontSize: "2vw", color: "#c0c0c0", lineHeight: 1.5, fontWeight: 400 }}>
              Bildirim için telefon edersin, koordinasyon eksik, yardım geç gelir.
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              flex: 1,
              background: "#1a1a1a",
              borderRadius: "1vw",
              padding: "3vh 2.5vw",
              borderTop: "0.4vh solid #d4af37",
            }}
          >
            <p style={{ fontSize: "3.2vw", fontWeight: 700, color: "#d4af37", marginBottom: "1vh" }}>Durum kaydı yok</p>
            <p style={{ fontSize: "2vw", color: "#c0c0c0", lineHeight: 1.5, fontWeight: 400 }}>
              Kim besledi? Kim gördü? Kim veterinere götürdü? Hiçbir iz kalmıyor.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              flex: 1,
              background: "#1a1a1a",
              borderRadius: "1vw",
              padding: "3vh 2.5vw",
              borderTop: "0.4vh solid #d4af37",
            }}
          >
            <p style={{ fontSize: "3.2vw", fontWeight: 700, color: "#d4af37", marginBottom: "1vh" }}>Dijital araç yok</p>
            <p style={{ fontSize: "2vw", color: "#c0c0c0", lineHeight: 1.5, fontWeight: 400 }}>
              Türkiye'de milyonlarca sokak hayvanı için mevcut dijital çözüm bulunmuyor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
