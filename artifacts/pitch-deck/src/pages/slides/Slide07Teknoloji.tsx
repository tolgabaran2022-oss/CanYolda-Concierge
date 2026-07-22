export default function Slide07Teknoloji() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.5vh", background: "#d4af37" }} />

      {/* Subtle code-grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px)",
          backgroundSize: "4vw 4vw",
          pointerEvents: "none",
        }}
      />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">07 / 10</span>
      </div>

      {/* Content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1vh" }}>
          Teknik Altyapı
        </p>
        <h2 style={{ fontSize: "4.6vw", fontWeight: 700, color: "#f8f9fa", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "0.8vh", textWrap: "balance" }}>
          iOS · Android · Web —<span style={{ color: "#d4af37" }}> tek kod tabanı.</span>
        </h2>
        <span className="gold-rule" style={{ marginBottom: "3.5vh" }} />

        {/* Tech stack — two columns */}
        <div style={{ display: "flex", gap: "4vw", marginTop: "2vh" }}>
          {/* Left column */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "1.4vw", fontWeight: 600, color: "#d4af37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2vh" }}>
              Mobil & Frontend
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.6vh" }}>
              <div style={{ background: "#1a1a1a", borderRadius: "0.6vw", padding: "1.8vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#f8f9fa" }}>Expo SDK 54</span>
                <span style={{ fontSize: "1.6vw", color: "#a0a0a0" }}>React Native 0.81</span>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: "0.6vw", padding: "1.8vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#f8f9fa" }}>expo-router</span>
                <span style={{ fontSize: "1.6vw", color: "#a0a0a0" }}>Dosya tabanlı yönlendirme</span>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: "0.6vw", padding: "1.8vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#f8f9fa" }}>TypeScript 5.9</span>
                <span style={{ fontSize: "1.6vw", color: "#a0a0a0" }}>0 hata</span>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "1.4vw", fontWeight: 600, color: "#d4af37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2vh" }}>
              Backend & Ödemeler
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.6vh" }}>
              <div style={{ background: "#1a1a1a", borderRadius: "0.6vw", padding: "1.8vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#f8f9fa" }}>Express + PostgreSQL</span>
                <span style={{ fontSize: "1.6vw", color: "#a0a0a0" }}>Drizzle ORM</span>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: "0.6vw", padding: "1.8vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#f8f9fa" }}>RevenueCat IAP</span>
                <span style={{ fontSize: "1.6vw", color: "#a0a0a0" }}>Stripe</span>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: "0.6vw", padding: "1.8vh 1.8vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#f8f9fa" }}>JWT Auth</span>
                <span style={{ fontSize: "1.6vw", color: "#a0a0a0" }}>Push Notifications</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
