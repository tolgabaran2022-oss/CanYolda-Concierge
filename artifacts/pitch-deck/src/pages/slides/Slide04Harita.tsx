export default function Slide04Harita() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.5vh", background: "#d4af37" }} />

      {/* Decorative grid pattern — subtle */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px)",
          backgroundSize: "5vw 5vw",
          pointerEvents: "none",
        }}
      />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">04 / 10</span>
      </div>

      {/* Content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1vh" }}>
          Raporlama & Harita
        </p>
        <h2 style={{ fontSize: "5vw", fontWeight: 700, color: "#f8f9fa", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: "1.5vh", textWrap: "balance" }}>
          Her mahalle, her hayvan — <span style={{ color: "#d4af37" }}>kayıt altında.</span>
        </h2>
        <span className="gold-rule" style={{ marginBottom: "4vh" }} />

        {/* Two-col: left bullets, right status markers */}
        <div className="flex" style={{ gap: "4vw", marginTop: "3vh" }}>
          <div style={{ flex: "0 0 46vw" }}>
            <div style={{ marginBottom: "2.5vh" }}>
              <p style={{ fontSize: "2.4vw", fontWeight: 600, color: "#f8f9fa", marginBottom: "0.6vh" }}>Gerçek zamanlı interaktif harita</p>
              <p style={{ fontSize: "1.9vw", color: "#a0a0a0", lineHeight: 1.5 }}>
                İstanbul'un tüm mahallelerini kapsayan dinamik sokak hayvanı haritası.
              </p>
            </div>
            <div style={{ marginBottom: "2.5vh" }}>
              <p style={{ fontSize: "2.4vw", fontWeight: 600, color: "#f8f9fa", marginBottom: "0.6vh" }}>Fotoğraf + konum + tarih</p>
              <p style={{ fontSize: "1.9vw", color: "#a0a0a0", lineHeight: 1.5 }}>
                Her rapor: fotoğraf, not, GPS koordinatı ve tüm güncelleme geçmişi.
              </p>
            </div>
            <div>
              <p style={{ fontSize: "2.4vw", fontWeight: 600, color: "#f8f9fa", marginBottom: "0.6vh" }}>Topluluk etkileşimi</p>
              <p style={{ fontSize: "1.9vw", color: "#a0a0a0", lineHeight: 1.5 }}>
                Beslendi işareti, yorum, gönüllü yardım talebi — hep birlikte.
              </p>
            </div>
          </div>

          {/* Right: status legend */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh" }}>
            <p style={{ fontSize: "1.5vw", color: "#a0a0a0", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1vh" }}>
              Durum Renk Kodları
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "2.4vw", height: "2.4vw", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
              <p style={{ fontSize: "2.2vw", color: "#f8f9fa", fontWeight: 500 }}>Yaralı</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "2.4vw", height: "2.4vw", borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
              <p style={{ fontSize: "2.2vw", color: "#f8f9fa", fontWeight: 500 }}>Aç</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "2.4vw", height: "2.4vw", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <p style={{ fontSize: "2.2vw", color: "#f8f9fa", fontWeight: 500 }}>Sağlıklı</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "2.4vw", height: "2.4vw", borderRadius: "50%", background: "#6b7280", flexShrink: 0 }} />
              <p style={{ fontSize: "2.2vw", color: "#f8f9fa", fontWeight: 500 }}>Bilinmiyor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
