import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";

export default function DemoOutfitDetail() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantIdx, setVariantIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`/api/demo/scenarios/${scenarioId}`);
        if (!cancelled) {
          setData(res);
          setVariantIdx(0);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scenarioId]);

  const outfits = data?.outfits ?? [];
  const current = outfits[variantIdx];

  const variantLabels = useMemo(
    () => outfits.map((o, i) => `Look ${i + 1}`),
    [outfits],
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", padding: 40, color: "#e24b4a", fontSize: 13 }}>
        Couldn't load this scenario: {error}
      </div>
    );
  }

  if (!data || outfits.length === 0) {
    return (
      <div style={{ minHeight: "100vh", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
        Nothing cached for this scenario yet.
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "0 22px 60px" }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 500px 350px at 15% 15%, rgba(196,149,106,0.06), transparent), radial-gradient(ellipse 400px 400px at 85% 85%, rgba(160,120,90,0.04), transparent)",
      }} />

      <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
        <header style={{ padding: "28px 0 16px" }}>
          <button onClick={() => navigate("/demo")} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: 13, padding: 0, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-body)",
          }}>← All scenarios</button>

          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
            Scenario
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", margin: 0, color: "var(--accent-light)" }}>
            {data.scenario.name}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
            {data.scenario.description}
          </p>
        </header>

        {outfits.length > 1 && (
          <div style={{
            display: "flex", gap: 8, marginBottom: 22,
            padding: "4px", borderRadius: 12,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.05)",
            width: "fit-content",
          }}>
            {variantLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => setVariantIdx(i)}
                style={{
                  padding: "8px 16px", borderRadius: 9, border: "none",
                  background: i === variantIdx ? "var(--accent)" : "transparent",
                  color: i === variantIdx ? "#fff" : "var(--text-muted)",
                  fontSize: 12.5, fontWeight: 500, letterSpacing: "-0.01em",
                  fontFamily: "var(--font-body)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >{label}</button>
            ))}
          </div>
        )}

        <OutfitCard outfit={current} />

        <div style={{
          marginTop: 36, padding: "26px 22px", borderRadius: 16,
          background: "rgba(196,149,106,0.06)",
          border: "1px solid rgba(196,149,106,0.2)",
          textAlign: "center",
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Use this with your own wardrobe.
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
            Scan in what you already own. Get the same kind of read on every outfit you wear.
          </p>
          <Link to="/" style={{
            display: "inline-block", padding: "11px 22px", borderRadius: 10,
            background: "var(--accent)", color: "#fff",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
            letterSpacing: "-0.01em",
          }}>Sign up for your own wardrobe →</Link>
        </div>

        <p style={{
          marginTop: 28, fontSize: 11, color: "var(--text-muted)",
          textAlign: "center", lineHeight: 1.5, fontStyle: "italic",
        }}>
          As an Amazon Associate, Seynario earns from qualifying purchases.
        </p>
      </div>
    </div>
  );
}


function OutfitCard({ outfit }) {
  if (!outfit) return null;

  return (
    <article style={{
      padding: "26px 22px", borderRadius: 16,
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.06)",
      animation: "fadeSlideIn 0.35s ease-out",
    }}>
      <div style={{
        fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent)",
        letterSpacing: 3, textTransform: "uppercase", marginBottom: 10,
      }}>Why this works</div>
      <p style={{
        fontSize: 14.5, lineHeight: 1.65, color: "var(--text-primary)",
        margin: "0 0 24px",
      }}>{outfit.rationale}</p>

      {outfit.sticky_note && (
        <div style={{
          marginBottom: 26, padding: "14px 16px", borderRadius: 8,
          background: "rgba(232, 207, 120, 0.12)",
          border: "1px solid rgba(232, 207, 120, 0.3)",
          color: "#e8cf78",
          fontSize: 13, lineHeight: 1.55, fontStyle: "italic",
        }}>
          <span style={{
            fontSize: 9.5, fontFamily: "var(--font-mono)", letterSpacing: 2,
            textTransform: "uppercase", color: "rgba(232,207,120,0.7)",
            display: "block", marginBottom: 4,
          }}>Stylist note</span>
          {outfit.sticky_note}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 18,
      }}>
        {outfit.items.map((item, i) => <ItemPolaroid key={`${item.id}-${i}`} item={item} />)}
      </div>
    </article>
  );
}


function ItemPolaroid({ item }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      padding: 12, borderRadius: 12,
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{
        aspectRatio: "1 / 1", borderRadius: 8,
        background: "rgba(255,255,255,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 12, overflow: "hidden",
      }}>
        <img
          src={item.svg_path}
          alt={item.name}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      </div>

      <div>
        <div style={{
          fontSize: 9.5, fontFamily: "var(--font-mono)", color: "var(--text-muted)",
          letterSpacing: 2, textTransform: "uppercase", marginBottom: 3,
        }}>{item.position}</div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 6 }}>
          {item.name}
        </div>
        {item.annotation && (
          <p style={{
            fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5,
            margin: "0 0 10px", fontStyle: "italic",
          }}>{item.annotation}</p>
        )}
        <a
          href={item.redirect_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={{
            display: "inline-block", fontSize: 12, color: "var(--accent-light)",
            textDecoration: "none", fontFamily: "var(--font-mono)",
            letterSpacing: 1, textTransform: "uppercase",
          }}
        >Find on Amazon →</a>
      </div>
    </div>
  );
}
