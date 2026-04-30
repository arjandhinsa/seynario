import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { SketchbookPage, Masthead, Polaroid, Annotation } from "./sketchbook";


const TILTS = [-3, 2.4, -1.6, 1.8, -2.2, 2.6];
const WASHIS = ["coral", "mustard", null, "blue", null, "coral"];
const tiltFor = (i) => TILTS[i % TILTS.length];
const decorationFor = (i) => {
  const w = WASHIS[i % WASHIS.length];
  return w ? { washi: w, pin: false } : { washi: null, pin: true };
};


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

      <main className="sb-detail">
        <header className="sb-detail__head">
          <div className="sb-eyebrow">
            {scenarios.length || 13} occasions · 18 sample garments
          </div>
          <h1 className="sb-display sb-display-xl">Pick a scenario.</h1>
          <p className="sb-detail__lede">
            Thirteen occasions. Three looks each. No sign-up.
          </p>
        </header>

        {loading && (
          <p className="sb-body" style={{ padding: "40px 0", textAlign: "center" }}>
            Loading…
          </p>
        )}

        {error && (
          <p className="sb-body" style={{ padding: "40px 0", textAlign: "center", color: "#b3361f" }}>
            Couldn't load scenarios: {error}
          </p>
        )}

        {!loading && !error && scenarios.length === 0 && (
          <p className="sb-body" style={{ padding: "40px 0", textAlign: "center" }}>
            No demo outfits cached yet. Run the pre-gen script.
          </p>
        )}

        {!loading && !error && scenarios.length > 0 && (
          <section className="sb-flatlay">
            {scenarios.map((s, i) => (
              <div key={s.id} className="sb-flatlay__slot">
                <Link
                  to={`/demo/scenarios/${s.id}`}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    display: "block",
                    width: "100%",
                    maxWidth: 180,
                  }}
                >
                  <Polaroid tilt={tiltFor(i)} caption={s.name} {...decorationFor(i)}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                      fontSize: 76,
                      lineHeight: 1,
                    }}>
                      {s.icon || "·"}
                    </div>
                  </Polaroid>
                </Link>
                <Annotation
                  side={i % 2 === 0 ? "right" : "left"}
                  colour="var(--sb-sepia)"
                >
                  {s.description}
                </Annotation>
              </div>
            ))}
          </section>
        )}
      </main>
    </SketchbookPage>
  );
}
