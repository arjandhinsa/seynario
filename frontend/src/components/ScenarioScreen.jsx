import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";
import { SketchbookPage, Masthead, Polaroid } from "./sketchbook";


const TILTS = [-3, 2.4, -1.6, 1.8, -2.2, 2.6];
const WASHIS = ["coral", "mustard", null, "blue", null, "coral"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const tiltFor = (i) => TILTS[i % TILTS.length];
const decorationFor = (i) => {
  const w = WASHIS[i % WASHIS.length];
  return w ? { washi: w, pin: false } : { washi: null, pin: true };
};


const ACCENT_BY_CATEGORY = {
  professional: "var(--sb-ink-blue)",
  social: "var(--sb-coral)",
  formal: "var(--sb-mustard)",
  casual: "var(--sb-sage)",
};
const ACCENT_BY_NAME = {
  "First Date": "var(--sb-coral)",
  "Job Interview": "var(--sb-ink-blue)",
  "Wedding Guest": "var(--sb-mustard)",
  "Black Tie Event": "var(--sb-charcoal)",
};
function mappedAccentFor(scenario) {
  if (!scenario) return undefined;
  return ACCENT_BY_NAME[scenario.name] || ACCENT_BY_CATEGORY[scenario.category];
}


export default function ScenarioScreen() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [scenario, setScenario] = useState(null);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [variantIdx, setVariantIdx] = useState(0);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      try {
        const s = await api.get(`/api/scenarios/${scenarioId}`, token);
        setScenario(s);
      } catch (e) {
        console.error("Failed to load scenario:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scenarioId]);

  const generateOutfits = async () => {
    setGenerating(true);
    const token = getToken();
    try {
      const results = await api.post("/api/outfits/recommend", {
        scenario_id: scenarioId,
        num_outfits: 3,
      }, token);
      setOutfits(results);
      setVariantIdx(0);
    } catch (e) {
      if (e.message.includes("style profile")) {
        alert("Complete your style profile first!");
        navigate("/profile");
      } else {
        console.error("Failed to generate outfits:", e);
      }
    } finally {
      setGenerating(false);
    }
  };

  const saveOutfit = async (outfitId) => {
    const token = getToken();
    try {
      await api.post(`/api/outfits/${outfitId}/save`, {}, token);
      setOutfits(prev => prev.map(o =>
        o.id === outfitId ? { ...o, is_saved: true } : o
      ));
    } catch (e) {
      console.error("Failed to save outfit:", e);
    }
  };

  if (loading) {
    return (
      <Shell scenario={null}>
        <p className="sb-body" style={{ padding: 60, textAlign: "center" }}>Loading…</p>
      </Shell>
    );
  }

  if (!scenario) {
    return (
      <Shell scenario={null}>
        <p className="sb-body" style={{ padding: 60, textAlign: "center" }}>Scenario not found.</p>
      </Shell>
    );
  }

  const current = outfits[variantIdx];

  return (
    <Shell scenario={scenario} compositionCount={outfits.length || 3}>
      <main className="sb-detail">
        <header className="sb-detail__head">
          <div className="sb-eyebrow">
            {scenario.icon ? `${scenario.icon} · ` : ""}Formality {scenario.formality_min}–{scenario.formality_max} of 5
          </div>
          <h1 className="sb-display sb-display-xl">{scenario.name}</h1>
          {scenario.description && (
            <p className="sb-detail__lede">{scenario.description}</p>
          )}
        </header>

        {outfits.length === 0 && !generating && (
          <section style={{ padding: "36px 0 0" }}>
            <button
              type="button"
              onClick={generateOutfits}
              style={{
                display: "inline-block",
                padding: "16px 28px",
                border: 0,
                background: "var(--sb-charcoal)",
                color: "var(--sb-paper)",
                fontFamily: "var(--sb-font-display)",
                fontSize: 16, letterSpacing: "0.04em",
                cursor: "pointer",
                transition: "transform 0.18s ease, background 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.background = "var(--sb-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.background = "var(--sb-charcoal)";
              }}
            >
              Style me for this scenario →
            </button>
          </section>
        )}

        {generating && (
          <section style={{
            padding: "60px 24px", marginTop: 32,
            background: "var(--sb-paper-card)",
            border: "1px dashed var(--sb-sepia-soft)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 38, marginBottom: 14 }}>👔</div>
            <p className="sb-display sb-display-md" style={{ fontStyle: "italic", margin: 0 }}>
              Composing three looks…
            </p>
            <p className="sb-body" style={{ color: "var(--sb-charcoal-soft)", marginTop: 8 }}>
              Reading the wardrobe against the moment.
            </p>
          </section>
        )}

        {outfits.length > 0 && current && (
          <>
            {outfits.length > 1 && (
              <nav className="sb-variant-tabs">
                {outfits.map((_, i) => {
                  const active = i === variantIdx;
                  return (
                    <button
                      key={i}
                      className={`sb-variant-tab${active ? " is-active" : ""}`}
                      onClick={() => setVariantIdx(i)}
                    >
                      <span className="sb-variant-tab__numeral">{ROMAN[i] ?? i + 1}</span>
                      <span className="sb-variant-tab__label">Look {i + 1}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            <section className="sb-flatlay">
              {current.items.map((item, i) => {
                const tilt = tiltFor(i);
                const dec = decorationFor(i);
                const label = (item.name || item.position || "").toLowerCase() || undefined;
                return (
                  <div key={item.id || `${i}`} className="sb-flatlay__slot">
                    <Polaroid tilt={tilt} caption={label} {...dec}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name || item.position || ""} />
                      ) : (
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: "100%", height: "100%",
                          padding: 14, textAlign: "center",
                          fontFamily: "var(--sb-font-hand)",
                          color: "var(--sb-sepia)", fontSize: 16, lineHeight: 1.25,
                        }}>
                          {item.name || "to source"}
                        </div>
                      )}
                    </Polaroid>
                  </div>
                );
              })}
            </section>

            {current.rationale && (
              <section className="sb-detail__why">
                <h2 className="sb-display sb-display-md">Why this works</h2>
                <p className="sb-body sb-body-drop">{current.rationale}</p>
              </section>
            )}

            <section className="sb-stockists">
              <header className="sb-stockists__head">
                <h3 className="sb-stockists__title">{current.name || "Composition"}</h3>
                <span className="sb-stockists__sub">
                  {current.items.filter(i => i.is_owned).length} owned · {current.items.filter(i => !i.is_owned).length} to source
                </span>
              </header>
              <ul className="sb-stockists__list">
                {current.items.map((item, i) => (
                  <li key={item.id || `row-${i}`} className="sb-stockists__row">
                    <div className="sb-stockists__thumb">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" />
                      ) : (
                        <span style={{
                          fontFamily: "var(--sb-font-hand)",
                          color: "var(--sb-sepia)", fontSize: 14, lineHeight: 1,
                          textAlign: "center",
                        }}>·</span>
                      )}
                    </div>
                    <div className="sb-stockists__name">
                      {item.name || (item.is_owned ? "From your wardrobe" : "To source")}
                      {item.position && <span className="sb-stockists__pos">{item.position}</span>}
                    </div>
                    {!item.is_owned && item.affiliate_url ? (
                      <a
                        href={item.affiliate_url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="sb-stockists__link"
                      >Buy →</a>
                    ) : (
                      <span style={{
                        fontFamily: "var(--sb-font-body)", fontSize: 11,
                        letterSpacing: "0.18em", textTransform: "uppercase",
                        color: "var(--sb-ink-soft)",
                      }}>Owned</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section style={{
              marginTop: 36, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
            }}>
              {current.is_saved ? (
                <span style={{
                  fontFamily: "var(--sb-font-display)", fontSize: 15,
                  letterSpacing: "0.04em",
                  padding: "14px 24px",
                  border: "1.4px dashed var(--sb-sage)",
                  color: "var(--sb-sage)",
                }}>✓ Saved</span>
              ) : (
                <button
                  type="button"
                  onClick={() => saveOutfit(current.id)}
                  style={{
                    background: "var(--sb-charcoal)", color: "var(--sb-paper)",
                    padding: "14px 28px", border: 0, borderRadius: 0,
                    fontFamily: "var(--sb-font-display)", fontSize: 15,
                    letterSpacing: "0.04em", cursor: "pointer",
                    transition: "transform 0.18s ease, background 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.background = "var(--sb-ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.background = "var(--sb-charcoal)";
                  }}
                >
                  Save this look
                </button>
              )}
              <button
                type="button"
                onClick={() => { setOutfits([]); setVariantIdx(0); generateOutfits(); }}
                style={{
                  background: "transparent",
                  padding: "14px 28px",
                  border: "1.4px solid var(--sb-charcoal)",
                  fontFamily: "var(--sb-font-display)", fontSize: 15,
                  letterSpacing: "0.02em",
                  color: "var(--sb-charcoal)",
                  cursor: "pointer",
                  transition: "background 0.18s ease, color 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--sb-charcoal)";
                  e.currentTarget.style.color = "var(--sb-paper)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--sb-charcoal)";
                }}
              >
                Compose three more →
              </button>
            </section>
          </>
        )}
      </main>
    </Shell>
  );
}


function Shell({ scenario, compositionCount, children }) {
  const accent = mappedAccentFor(scenario);
  const title = scenario ? scenario.name.toUpperCase() : "SEYNARIO";
  const eyebrow = scenario ? `${compositionCount ?? 3} compositions` : "Loading…";
  return (
    <SketchbookPage accent={accent}>
      <Masthead
        title={title}
        eyebrow={eyebrow}
        right={<Link to="/">← Home</Link>}
      />
      {children}
    </SketchbookPage>
  );
}
