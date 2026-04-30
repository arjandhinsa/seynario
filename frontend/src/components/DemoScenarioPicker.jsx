import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { SketchbookPage, Masthead } from "./sketchbook";

export default function DemoScenarioPicker() {
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
    <SketchbookPage>
      <Masthead
        title="SEYNARIO"
        eyebrow="Sample wardrobe demo"
        right={<Link to="/">← Back to sign in</Link>}
      />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 22px 60px" }}>
        <h1 className="sb-display sb-display-lg" style={{ marginBottom: 8 }}>
          Pick a scenario.
        </h1>
        <p className="sb-body" style={{ color: "var(--sb-charcoal-soft)", marginBottom: 32 }}>
          18 sample garments. {scenarios.length} occasions. No sign-up.
        </p>

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
      </main>
    </SketchbookPage>
  );
}
