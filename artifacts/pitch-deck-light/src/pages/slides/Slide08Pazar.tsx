export default function Slide08Pazar() {
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
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>08 / 10</span>
      </div>

      {/* Two-column layout */}
      <div className="absolute flex" style={{ top: "14vh", left: "5vw", right: "5vw", bottom: "10vh", gap: "5vw" }}>
        {/* Left: big stat */}
        <div style={{ flex: "0 0 38vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
          <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#3B6E8C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "2vh" }}>
            Pazar Fırsatı
          </p>
          <p style={{ fontSize: "11vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.05em", lineHeight: 0.9, marginBottom: "1.5vh" }}>
            85M
          </p>
          <p style={{ fontSize: "2.4vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "1.5vh" }}>
            Türkiye nüfusu
          </p>
          <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
          <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.6, textWrap: "pretty" }}>
            Evcil hayvan sahipliği hızla büyüyor, sokak hayvanı sorunu her büyük şehirde gündem maddesi. [sektör raporları]
          </p>
        </div>

        {/* Right: opportunity cards */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.5vh" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Pazar boş</p>
            <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>Bu ölçekte ve kapsamda mevcut dijital çözüm yok.</p>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Topluluk büyümesi</p>
            <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>Gönüllü ağları ve hayvan sevenlerle organik yayılım.</p>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Şehir iş birlikleri</p>
            <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>Büyükşehir belediyeleriyle kurumsal ortaklık potansiyeli.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
