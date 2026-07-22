const base = import.meta.env.BASE_URL;

export default function Slide01Kapak() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#F7F6F3", fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Teal left sidebar strip */}
      <div className="absolute top-0 left-0 bottom-0" style={{ width: "0.5vw", background: "#3B6E8C" }} />

      {/* Right panel — photo */}
      <div className="absolute" style={{ top: 0, right: 0, width: "44vw", bottom: 0 }}>
        <img
          src={`${base}hero-dog.png`}
          crossOrigin="anonymous"
          alt="Sokak hayvanı"
          className="w-full h-full object-cover"
        />
        {/* Soft left fade */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, #F7F6F3 0%, rgba(247,246,243,0.0) 35%)" }}
        />
      </div>

      {/* Brand mark — top left */}
      <div className="absolute" style={{ top: "4.5vh", left: "4vw" }}>
        <span style={{ fontSize: "1.4vw", fontWeight: 700, color: "#3B6E8C", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          CanYoldaşı
        </span>
      </div>

      {/* Page number — bottom right */}
      <div className="absolute" style={{ bottom: "3.5vh", right: "4vw" }}>
        <span style={{ fontSize: "1.1vw", color: "#8C8C99", fontWeight: 300 }}>01 / 10</span>
      </div>

      {/* Left content */}
      <div className="absolute" style={{ top: "50%", left: "5vw", transform: "translateY(-50%)", maxWidth: "50vw" }}>
        <div style={{ width: "5vw", height: "0.25vh", background: "#3B6E8C", marginBottom: "3vh" }} />
        <p style={{ fontSize: "1.6vw", fontWeight: 300, color: "#8C8C99", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2.5vh" }}>
          Topluluk Odaklı Mobil Uygulama
        </p>
        <h1 style={{ fontSize: "7.5vw", fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.03em", lineHeight: 0.95, marginBottom: "3.5vh", textWrap: "balance" }}>
          Can
          <span style={{ color: "#3B6E8C" }}>Yoldaşı</span>
        </h1>
        <p style={{ fontSize: "2.4vw", fontWeight: 400, color: "#1C1C1E", lineHeight: 1.45, marginBottom: "1.2vh", textWrap: "pretty" }}>
          Sokak hayvanlarının yanında, her zaman.
        </p>
        <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5, textWrap: "pretty" }}>
          Türkiye'nin sokak hayvanı topluluk uygulaması —
        </p>
        <p style={{ fontSize: "1.9vw", fontWeight: 300, color: "#8C8C99", lineHeight: 1.5 }}>
          bildir, takip et, sahiplendir.
        </p>
      </div>
    </div>
  );
}
