export default function Slide08Pazar() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.5vh", background: "#d4af37" }} />

      {/* Subtle dark gold gradient bottom left */}
      <div
        className="absolute"
        style={{
          bottom: "-5vh",
          left: "-5vw",
          width: "55vw",
          height: "55vh",
          background: "radial-gradient(ellipse at bottom left, rgba(212,175,55,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">08 / 10</span>
      </div>

      {/* Two-column layout */}
      <div className="absolute flex" style={{ top: "14vh", left: "5vw", right: "5vw", bottom: "10vh", gap: "4vw" }}>
        {/* Left */}
        <div style={{ flex: "0 0 42vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1vh" }}>
            Pazar Fırsatı
          </p>
          <div style={{ marginBottom: "0.5vh" }}>
            <span style={{ fontSize: "11vw", fontWeight: 700, color: "#d4af37", lineHeight: 1, letterSpacing: "-0.04em" }}>85M</span>
          </div>
          <p style={{ fontSize: "2.4vw", fontWeight: 600, color: "#f8f9fa", marginBottom: "1.5vh" }}>
            Türkiye nüfusu
          </p>
          <span className="gold-rule" style={{ marginBottom: "2.5vh" }} />
          <p style={{ fontSize: "1.9vw", color: "#a0a0a0", lineHeight: 1.6, textWrap: "pretty" }}>
            Evcil hayvan sahipliği hızla büyüyor, sokak hayvanı sorunu her büyük şehirde gündem maddesi. [sektör raporları]
          </p>
        </div>

        {/* Right: opportunity bullets */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.5vh" }}>
          <div style={{ background: "#1a1a1a", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", borderLeft: "0.3vw solid #d4af37" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.6vh" }}>Pazar boş</p>
            <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>
              Türkiye'de bu ölçekte ve kapsamda mevcut dijital çözüm yok.
            </p>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", borderLeft: "0.3vw solid #d4af37" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.6vh" }}>Topluluk büyümesi</p>
            <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>
              Gönüllü ağları, hayvan sevenler ve belediye destekçileriyle organik yayılım.
            </p>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", borderLeft: "0.3vw solid #d4af37" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.6vh" }}>Şehir iş birlikleri</p>
            <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>
              Büyükşehir belediyeleriyle kurumsal ortaklık potansiyeli.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
