export default function Slide05Evcilim() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.5vh", background: "#d4af37" }} />

      {/* Subtle gold glow right */}
      <div
        className="absolute"
        style={{
          top: "0",
          right: "-10vw",
          width: "50vw",
          height: "100vh",
          background: "radial-gradient(ellipse at right, rgba(212,175,55,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">05 / 10</span>
      </div>

      {/* Main content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1vh" }}>
          Evcilim & Sahiplendirme
        </p>
        <h2 style={{ fontSize: "4.8vw", fontWeight: 700, color: "#f8f9fa", letterSpacing: "-0.02em", lineHeight: 1.08, marginBottom: "0.5vh", textWrap: "balance" }}>
          Evcil hayvanın için tam profil,
        </h2>
        <h2 style={{ fontSize: "4.8vw", fontWeight: 700, color: "#d4af37", letterSpacing: "-0.02em", lineHeight: 1.08, marginBottom: "1.5vh", textWrap: "balance" }}>
          sahiplendirme için platform.
        </h2>
        <span className="gold-rule" style={{ marginBottom: "3.5vh" }} />

        {/* Four feature cards — 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vh 2.5vw", marginTop: "2vh" }}>
          <div style={{ background: "#1a1a1a", borderRadius: "0.8vw", padding: "2.4vh 2vw", borderLeft: "0.3vw solid #d4af37" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.8vh" }}>Profil Yönetimi</p>
            <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>
              Aşı takvimi, randevular, beslenme notları ve belgeler — tek ekranda.
            </p>
          </div>

          <div style={{ background: "#1a1a1a", borderRadius: "0.8vw", padding: "2.4vh 2vw", borderLeft: "0.3vw solid #d4af37" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.8vh" }}>Sahiplendirme Panosu</p>
            <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>
              Fotoğraflı ilan oluştur, iletişim bilgisi ekle, talepleri takip et.
            </p>
          </div>

          <div style={{ background: "#1a1a1a", borderRadius: "0.8vw", padding: "2.4vh 2vw", borderLeft: "0.3vw solid #d4af37" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.8vh" }}>Doğrudan Mesajlaşma</p>
            <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>
              İlan sahibiyle uygulama içinden doğrudan mesajlaş.
            </p>
          </div>

          <div style={{ background: "#1a1a1a", borderRadius: "0.8vw", padding: "2.4vh 2vw", borderLeft: "0.3vw solid #d4af37" }}>
            <p style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f8f9fa", marginBottom: "0.8vh" }}>Öne Çıkarma</p>
            <p style={{ fontSize: "1.8vw", color: "#a0a0a0", lineHeight: 1.5 }}>
              İlanı öne çıkar — daha fazla ilgi, daha hızlı sahiplendirme.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
