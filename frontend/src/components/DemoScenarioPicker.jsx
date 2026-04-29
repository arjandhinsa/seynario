import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";

export default function DemoScenarioPicker() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/api/demo/scenarios");
        if (!cancelled) setScenarios(data.filter(s => s.outfit_count > 0));
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: "100vh", padding: "0 22px 60px" }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 500px 350px at 20% 20%, rgba(196,149,106,0.06), transparent), radial-gradient(ellipse 400px 400px at 80% 80%, rgba(160,120,90,0.04), transparent)",
      }} />

      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
        <header style={{ padding: "28px 0 22px" }}>
          <button onClick={() => navigate("/")} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: 13, padding: 0, marginBottom: 18,
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-body)",
          }}>← Back to sign in</button>

          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>
            Sample wardrobe demo
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: 0, color: "var(--accent-light)" }}>
            Pick a scenario.
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
            18 sample garments. {scenarios.length} occasions. No sign-up.
          </p>
        </header>

        {loading && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0" }}>Loading…</p>
        )}

        {error && (
          <p style={{ color: "#e24b4a", fontSize: 13, padding: "20px 0" }}>
            Couldn't load scenarios: {error}
          </p>
        )}

        {!loading && !error && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
            marginTop: 8,
          }}>
            {scenarios.map(s => (
              <Link key={s.id} to={`/demo/scenarios/${s.id}`} style={{
                textDecoration: "none", color: "inherit",
                padding: "18px 18px 16px", borderRadius: 14,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", flexDirection: "column", gap: 8,
                transition: "border-color 0.18s, background 0.18s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(196,149,106,0.35)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.background = "rgba(255,255,255,0.025)";
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{s.icon || "·"}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
                    {s.name}
                  </span>
                </div>
                <p style={{
                  fontSize: 12.5, color: "var(--text-muted)", margin: 0,
                  lineHeight: 1.5, flex: 1,
                }}>{s.description}</p>
                <span style={{
                  fontSize: 10.5, fontFamily: "var(--font-mono)",
                  color: "var(--accent)", letterSpacing: 2, textTransform: "uppercase",
                  marginTop: 2,
                }}>{s.outfit_count} {s.outfit_count === 1 ? "look" : "looks"}</span>
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && scenarios.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "30px 0" }}>
            No demo outfits cached yet. Run the pre-gen script.
          </p>
        )}
      </div>
    </div>
  );
}
