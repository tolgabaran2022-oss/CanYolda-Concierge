export default function Slide04Harita() {
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
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>04 / 10</span>
      </div>

      {/* Content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
        <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#3B6E8C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
          Raporlama & Harita
        </p>
        <h2 style={{ fontSize: "4.8vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: "4vh", textWrap: "balance" }}>
          Her mahalle, her hayvan — kayıt altında.
        </h2>

        {/* Two columns */}
        <div style={{ display: "flex", gap: "4vw" }}>
          {/* Left: features */}
          <div style={{ flex: "0 0 50vw", display: "flex", flexDirection: "column", gap: "2.5vh" }}>
            <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
              <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Gerçek zamanlı interaktif harita</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>İstanbul'un tüm mahallelerini kapsayan dinamik sokak hayvanı haritası.</p>
            </div>
            <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
              <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Fotoğraf + konum + geçmiş</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>Her rapor: fotoğraf, not, GPS koordinatı ve tüm güncelleme geçmişi.</p>
            </div>
            <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.5vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
              <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.6vh" }}>Topluluk etkileşimi</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>Beslendi işareti, yorum ve gönüllü yardım talebi.</p>
            </div>
          </div>

          {/* Right: status legend */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.5vh" }}>
            <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#8C8C99", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
              Durum Renkleri
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
              <p style={{ fontSize: "2.2vw", fontWeight: 500, color: "#1C1C1E" }}>Yaralı</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
              <p style={{ fontSize: "2.2vw", fontWeight: 500, color: "#1C1C1E" }}>Aç</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <p style={{ fontSize: "2.2vw", fontWeight: 500, color: "#1C1C1E" }}>Sağlıklı</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "2.2vw", height: "2.2vw", borderRadius: "50%", background: "#9ca3af", flexShrink: 0 }} />
              <p style={{ fontSize: "2.2vw", fontWeight: 500, color: "#1C1C1E" }}>Bilinmiyor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
