export default function Slide06IsModeli() {
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
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>06 / 10</span>
      </div>

      {/* Content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
        <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#3B6E8C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
          İş Modeli
        </p>
        <h2 style={{ fontSize: "4.6vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: "4vh", textWrap: "balance" }}>
          Freemium + Premium abonelik
        </h2>

        {/* Three tiers */}
        <div style={{ display: "flex", gap: "2.5vw" }}>
          {/* Free */}
          <div style={{ flex: 1, background: "#FFFFFF", borderRadius: "0.8vw", padding: "3vh 2.5vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <p style={{ fontSize: "1.2vw", fontWeight: 600, color: "#8C8C99", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2vh" }}>Ücretsiz</p>
            <p style={{ fontSize: "2.6vw", fontWeight: 700, color: "#1C1C1E", marginBottom: "2.5vh" }}>Herkes için temel</p>
            <div style={{ borderTop: "0.15vh solid #F0EFEd", paddingTop: "2vh", display: "flex", flexDirection: "column", gap: "1vh" }}>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#1C1C1E" }}>1 evcil hayvan profili</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#1C1C1E" }}>Sınırsız sokak bildirimi</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#1C1C1E" }}>Sahiplendirme ilanı</p>
            </div>
          </div>

          {/* Premium */}
          <div style={{
            flex: 1,
            background: "#3B6E8C",
            borderRadius: "0.8vw",
            padding: "3vh 2.5vw",
            position: "relative",
          }}>
            <div style={{ position: "absolute", top: "-1.5vh", right: "2vw", background: "#D4623A", borderRadius: "0.4vw", padding: "0.5vh 1.2vw" }}>
              <p style={{ fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF" }}>RevenueCat IAP</p>
            </div>
            <p style={{ fontSize: "1.2vw", fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2vh" }}>Premium</p>
            <p style={{ fontSize: "2.6vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "2.5vh" }}>Sahipler için tam güç</p>
            <div style={{ borderTop: "0.15vh solid rgba(255,255,255,0.2)", paddingTop: "2vh", display: "flex", flexDirection: "column", gap: "1vh" }}>
              <p style={{ fontSize: "1.8vw", fontWeight: 400, color: "#FFFFFF" }}>Sınırsız evcil hayvan profili</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 400, color: "#FFFFFF" }}>AI Hayvan Asistanı</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 400, color: "#FFFFFF" }}>İlaç & belge yönetimi</p>
            </div>
          </div>

          {/* Future */}
          <div style={{ flex: 1, background: "#FFFFFF", borderRadius: "0.8vw", padding: "3vh 2.5vw", boxShadow: "0 1px 4px rgba(28,28,30,0.08)" }}>
            <p style={{ fontSize: "1.2vw", fontWeight: 600, color: "#8C8C99", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2vh" }}>Gelecek</p>
            <p style={{ fontSize: "2.6vw", fontWeight: 700, color: "#1C1C1E", marginBottom: "2.5vh" }}>Genişleyen ekosistem</p>
            <div style={{ borderTop: "0.15vh solid #F0EFED", paddingTop: "2vh", display: "flex", flexDirection: "column", gap: "1vh" }}>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#1C1C1E" }}>Boost — ilan öne çıkarma</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#1C1C1E" }}>Veteriner iş birlikleri</p>
              <p style={{ fontSize: "1.8vw", fontWeight: 300, color: "#1C1C1E" }}>Belediye entegrasyonu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
