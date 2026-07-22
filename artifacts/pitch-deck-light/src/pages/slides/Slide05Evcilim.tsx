export default function Slide05Evcilim() {
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
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>05 / 10</span>
      </div>

      {/* Content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
        <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#3B6E8C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
          Evcilim & Sahiplendirme
        </p>
        <h2 style={{ fontSize: "4.6vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: "4vh", textWrap: "balance" }}>
          Evcil hayvanın için tam profil, sahiplendirme için platform.
        </h2>

        {/* 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vh 2.5vw" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <div style={{ width: "3vw", height: "0.25vh", background: "#D4623A", marginBottom: "1.5vh" }} />
            <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.8vh" }}>Profil Yönetimi</p>
            <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>
              Aşı takvimi, randevular, beslenme notları, belgeler — tek ekranda.
            </p>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <div style={{ width: "3vw", height: "0.25vh", background: "#D4623A", marginBottom: "1.5vh" }} />
            <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.8vh" }}>Sahiplendirme Panosu</p>
            <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>
              Fotoğraflı ilan oluştur, iletişim bilgisi ekle, talepleri takip et.
            </p>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <div style={{ width: "3vw", height: "0.25vh", background: "#D4623A", marginBottom: "1.5vh" }} />
            <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.8vh" }}>Doğrudan Mesajlaşma</p>
            <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>
              İlan sahibiyle uygulama içinden doğrudan mesajlaş.
            </p>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <div style={{ width: "3vw", height: "0.25vh", background: "#D4623A", marginBottom: "1.5vh" }} />
            <p style={{ fontSize: "2.2vw", fontWeight: 600, color: "#1C1C1E", marginBottom: "0.8vh" }}>Öne Çıkarma</p>
            <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>
              İlanı öne çıkar — daha fazla ilgi, daha hızlı sahiplendirme.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
