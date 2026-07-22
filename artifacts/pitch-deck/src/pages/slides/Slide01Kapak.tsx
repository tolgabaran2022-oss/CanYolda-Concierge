const base = import.meta.env.BASE_URL;

export default function Slide01Kapak() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#111111", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      {/* Hero image — right half */}
      <div className="absolute inset-0 flex">
        <div className="w-1/2" />
        <div className="w-1/2 relative">
          <img
            src={`${base}hero-istanbul.png`}
            crossOrigin="anonymous"
            alt="Istanbul"
            className="w-full h-full object-cover"
          />
          {/* Dark gradient blending into left */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, #111111 0%, rgba(17,17,17,0.55) 40%, rgba(17,17,17,0.0) 100%)" }}
          />
        </div>
      </div>

      {/* Bottom dark vignette */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: "30vh", background: "linear-gradient(to top, rgba(17,17,17,0.95), transparent)" }}
      />

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4vh", left: "5vw" }}>
        <span className="brand-mark">CanYoldaşı</span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span className="page-num">01 / 10</span>
      </div>

      {/* Left content */}
      <div className="absolute" style={{ top: "50%", left: "5vw", transform: "translateY(-50%)", maxWidth: "46vw" }}>
        <p style={{ fontSize: "1.8vw", color: "#d4af37", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "2vh" }}>
          Topluluk Odaklı Mobil Uygulama
        </p>
        <h1
          style={{ fontSize: "7.5vw", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.02em", color: "#f8f9fa", marginBottom: "1.5vh", textWrap: "balance" }}
        >
          CanYoldaşı
        </h1>
        <span className="gold-rule" style={{ width: "8vw", marginBottom: "3vh" }} />
        <p style={{ fontSize: "2.4vw", color: "#d4d4d4", fontWeight: 400, lineHeight: 1.5, marginTop: "2vh", textWrap: "pretty" }}>
          Sokak hayvanlarının yanında, her zaman.
        </p>
        <p style={{ fontSize: "1.9vw", color: "#a0a0a0", fontWeight: 400, lineHeight: 1.5, marginTop: "1.5vh", textWrap: "pretty" }}>
          Türkiye'nin sokak hayvanı topluluk uygulaması —
        </p>
        <p style={{ fontSize: "1.9vw", color: "#a0a0a0", fontWeight: 400, lineHeight: 1.5, textWrap: "pretty" }}>
          bildir, takip et, sahiplendir.
        </p>
      </div>
    </div>
  );
}
