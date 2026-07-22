export default function Slide10Vizyon() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#3B6E8C", fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Warm terracotta diagonal accent — bottom right */}
      <div
        className="absolute"
        style={{
          bottom: 0,
          right: 0,
          width: "35vw",
          height: "35vw",
          background: "#D4623A",
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
        }}
      />

      {/* Very subtle pattern overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "3vw 3vw",
          pointerEvents: "none",
        }}
      />

      {/* Brand mark — top left in white */}
      <div className="absolute" style={{ top: "4.5vh", left: "5vw" }}>
        <span style={{ fontSize: "1.4vw", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          CanYoldaşı
        </span>
      </div>

      {/* Page number */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span style={{ fontSize: "1.1vw", color: "rgba(255,255,255,0.5)", fontWeight: 300 }}>10 / 10</span>
      </div>

      {/* Centered content */}
      <div
        className="absolute"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          width: "70vw",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "3vh" }}>
          <div style={{ width: "6vw", height: "0.25vh", background: "rgba(255,255,255,0.4)" }} />
        </div>
        <p style={{ fontSize: "1.4vw", fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "2.5vh" }}>
          Vizyon
        </p>
        <h2 style={{ fontSize: "5.5vw", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: "4vh", textWrap: "balance" }}>
          Türkiye'nin sokak hayvanları için topluluk altyapısı.
        </h2>
        <p style={{ fontSize: "2.5vw", fontWeight: 300, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: "1.2vh", textWrap: "pretty" }}>
          Her bildiri bir hayatı kurtarır.
        </p>
        <p style={{ fontSize: "2.5vw", fontWeight: 300, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: "5vh", textWrap: "pretty" }}>
          Her sahiplendirme bir aileyi tamamlar.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "3vh" }}>
          <div style={{ width: "6vw", height: "0.25vh", background: "rgba(255,255,255,0.3)" }} />
        </div>
        <p style={{ fontSize: "2vw", fontWeight: 300, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>
          canyoldasi@example.com
        </p>
      </div>
    </div>
  );
}
