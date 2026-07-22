const base = import.meta.env.BASE_URL;

export default function Slide10Vizyon() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Background image — full bleed, low opacity */}
      <img
        src={`${base}hero-paw-network.png`}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.25 }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(17,17,17,0.95) 0%, rgba(17,17,17,0.7) 60%, rgba(17,17,17,0.85) 100%)" }} />

      {/* Gold top accent bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: "0.5vh", background: "#d4af37" }} />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">10 / 10</span>
      </div>

      {/* Centered content */}
      <div
        className="absolute"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          width: "80vw",
        }}
      >
        <p style={{ fontSize: "1.4vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "3vh" }}>
          Vizyon
        </p>
        <h2 style={{ fontSize: "5.5vw", fontWeight: 700, color: "#f8f9fa", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "1.5vh", textWrap: "balance" }}>
          Türkiye'nin sokak hayvanları için
        </h2>
        <h2 style={{ fontSize: "5.5vw", fontWeight: 700, color: "#d4af37", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "3vh", textWrap: "balance" }}>
          topluluk altyapısı.
        </h2>

        {/* Gold rule centered */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "4vh" }}>
          <span style={{ display: "block", width: "8vw", height: "0.3vh", background: "#d4af37" }} />
        </div>

        <p style={{ fontSize: "2.6vw", color: "#d4d4d4", lineHeight: 1.6, marginBottom: "1.2vh", textWrap: "pretty" }}>
          Her bildiri bir hayatı kurtarır.
        </p>
        <p style={{ fontSize: "2.6vw", color: "#d4d4d4", lineHeight: 1.6, marginBottom: "5vh", textWrap: "pretty" }}>
          Her sahiplendirme bir aileyi tamamlar.
        </p>

        <p style={{ fontSize: "2vw", color: "#a0a0a0", letterSpacing: "0.05em" }}>
          canyoldasi@example.com
        </p>
      </div>
    </div>
  );
}
