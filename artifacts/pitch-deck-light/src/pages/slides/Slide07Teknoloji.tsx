export default function Slide07Teknoloji() {
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
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>07 / 10</span>
      </div>

      {/* Content */}
      <div className="absolute" style={{ top: "14vh", left: "5vw", right: "5vw" }}>
        <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "1.5vh" }} />
        <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#3B6E8C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
          Teknik Altyapı
        </p>
        <h2 style={{ fontSize: "4.6vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: "4vh", textWrap: "balance" }}>
          iOS · Android · Web — tek kod tabanı.
        </h2>

        {/* Two columns */}
        <div style={{ display: "flex", gap: "3vw" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#8C8C99", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2vh" }}>
              Mobil & Frontend
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
              <div style={{ background: "#FFFFFF", borderRadius: "0.6vw", padding: "1.8vh 2vw", boxShadow: "0 1px 3px rgba(28,28,30,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#1C1C1E" }}>Expo SDK 54</span>
                <span style={{ fontSize: "1.6vw", fontWeight: 300, color: "#8C8C99" }}>React Native 0.81</span>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: "0.6vw", padding: "1.8vh 2vw", boxShadow: "0 1px 3px rgba(28,28,30,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#1C1C1E" }}>expo-router</span>
                <span style={{ fontSize: "1.6vw", fontWeight: 300, color: "#8C8C99" }}>Dosya tabanlı yönlendirme</span>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: "0.6vw", padding: "1.8vh 2vw", boxShadow: "0 1px 3px rgba(28,28,30,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#1C1C1E" }}>TypeScript 5.9</span>
                <span style={{ fontSize: "1.6vw", fontWeight: 300, color: "#8C8C99" }}>0 hata</span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "1.3vw", fontWeight: 600, color: "#8C8C99", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2vh" }}>
              Backend & Ödemeler
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
              <div style={{ background: "#FFFFFF", borderRadius: "0.6vw", padding: "1.8vh 2vw", boxShadow: "0 1px 3px rgba(28,28,30,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#1C1C1E" }}>Express + PostgreSQL</span>
                <span style={{ fontSize: "1.6vw", fontWeight: 300, color: "#8C8C99" }}>Drizzle ORM</span>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: "0.6vw", padding: "1.8vh 2vw", boxShadow: "0 1px 3px rgba(28,28,30,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#1C1C1E" }}>RevenueCat IAP</span>
                <span style={{ fontSize: "1.6vw", fontWeight: 300, color: "#8C8C99" }}>Stripe</span>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: "0.6vw", padding: "1.8vh 2vw", boxShadow: "0 1px 3px rgba(28,28,30,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "2vw", fontWeight: 600, color: "#1C1C1E" }}>JWT Auth</span>
                <span style={{ fontSize: "1.6vw", fontWeight: 300, color: "#8C8C99" }}>Push Notifications</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
