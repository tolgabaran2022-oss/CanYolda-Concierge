export default function Slide02Sorun() {
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
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>02 / 10</span>
      </div>

      {/* Content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
        <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#3B6E8C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
          Sorun
        </p>
        <h2 style={{ fontSize: "5.2vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.025em", lineHeight: 1.08, marginBottom: "4.5vh", textWrap: "balance" }}>
          Milyonlarca can, görünmez ve takipsiz.
        </h2>

        {/* Three cards */}
        <div style={{ display: "flex", gap: "2.5vw" }}>
          <div style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            boxShadow: "0 1px 4px rgba(28,28,30,0.08)",
          }}>
            <p style={{ fontSize: "3.8vw", fontWeight: 700, color: "#3B6E8C", marginBottom: "1.5vh", lineHeight: 1 }}>01</p>
            <p style={{ fontSize: "2.4vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "1.2vh" }}>Koordinasyon yok</p>
            <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.55 }}>
              Bildirim için telefon edersin, koordinasyon eksik, yardım geç gelir.
            </p>
          </div>
          <div style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            boxShadow: "0 1px 4px rgba(28,28,30,0.08)",
          }}>
            <p style={{ fontSize: "3.8vw", fontWeight: 700, color: "#3B6E8C", marginBottom: "1.5vh", lineHeight: 1 }}>02</p>
            <p style={{ fontSize: "2.4vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "1.2vh" }}>Durum kaydı yok</p>
            <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.55 }}>
              Kim besledi? Kim gördü? Kim veterinere götürdü? Hiçbir iz kalmıyor.
            </p>
          </div>
          <div style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            boxShadow: "0 1px 4px rgba(28,28,30,0.08)",
          }}>
            <p style={{ fontSize: "3.8vw", fontWeight: 700, color: "#3B6E8C", marginBottom: "1.5vh", lineHeight: 1 }}>03</p>
            <p style={{ fontSize: "2.4vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "1.2vh" }}>Dijital araç yok</p>
            <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.55 }}>
              Türkiye'de bu ölçekte mevcut dijital çözüm bulunmuyor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
