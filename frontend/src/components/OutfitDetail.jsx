import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";
import { SketchbookPage, Masthead, Polaroid, Annotation, StickyNote } from "./sketchbook";


const TILTS = [-3, 2.4, -1.6, 1.8, -2.2, 2.6];
const WASHIS = ["coral", "mustard", null, "blue", null, "coral"];
const tiltFor = (i) => TILTS[i % TILTS.length];
const decorationFor = (i) => {
  const w = WASHIS[i % WASHIS.length];
  return w ? { washi: w, pin: false } : { washi: null, pin: true };
};


// Stand-in SVGs for affiliate gap items that don't have a Cloudinary photo.
// Drawn from the public demo wardrobe — same set the demo uses. Mapped by
// position so the polaroid still reads as a recognisable garment shape.
const FALLBACK_SVG = {
  top:        "/wardrobe/white-cotton-crew-tee.svg",
  bottom:     "/wardrobe/indigo-wide-leg-jeans.svg",
  outerwear:  "/wardrobe/navy-blazer.svg",
  footwear:   "/wardrobe/tan-leather-loafers.svg",
  shoes:      "/wardrobe/tan-leather-loafers.svg",
  accessory:  "/wardrobe/brown-leather-belt.svg",
};
const fallbackSvgFor = (position) => FALLBACK_SVG[position] || FALLBACK_SVG.top;

const truncate = (s, n) =>
  s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

function captionFor(item) {
  const raw = item.name || item.position || "";
  if (!raw) return undefined;
  if (item.is_owned === false) {
    return truncate(raw, 30).toLowerCase();
  }
  return raw.toLowerCase();
}


export default function OutfitDetail() {
  const { outfitId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [outfit, setOutfit] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const token = getToken();
      try {
        const found = await api.get(`/api/outfits/${outfitId}`, token);
        if (cancelled) return;
        if (!found) {
          setError("Outfit not found");
          return;
        }
        setOutfit(found);
        if (found.scenario_id) {
          try {
            const sc = await api.get(`/api/scenarios/${found.scenario_id}`, token);
            if (!cancelled) setScenario(sc);
          } catch {
            // scenario lookup is non-critical
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load outfit");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [outfitId]);

  const save = async () => {
    const token = getToken();
    try {
      await api.post(`/api/outfits/${outfitId}/save`, {}, token);
      setOutfit((o) => (o ? { ...o, is_saved: true } : o));
    } catch (e) {
      console.error("Failed to save:", e);
    }
  };

  const unsave = async () => {
    const token = getToken();
    try {
      await api.delete(`/api/outfits/${outfitId}/save`, token);
      navigate("/");
    } catch (e) {
      console.error("Failed to unsave:", e);
    }
  };

  if (loading) return <Shell><CenteredMessage>Loading…</CenteredMessage></Shell>;
  if (error) return <Shell><CenteredMessage tone="error">{error}</CenteredMessage></Shell>;
  if (!outfit) return <Shell><CenteredMessage>Outfit not found.</CenteredMessage></Shell>;

  const items = Array.isArray(outfit.items) ? outfit.items : [];
  const gapItems = items.filter((i) => i && i.is_owned === false);
  const showStockists = gapItems.length > 0;
  const savedDate = formatDate(outfit.created_at);

  return (
    <Shell>
      <main className="sb-detail">
        <section className="sb-detail__head">
          <div className="sb-eyebrow">
            Saved look{savedDate ? ` · ${savedDate}` : ""}
          </div>
          <h1 className="sb-display sb-display-xl">
            {scenario?.name || outfit.name || "Saved look"}
          </h1>
          {scenario?.description && (
            <p className="sb-detail__lede">{scenario.description}</p>
          )}
        </section>

        {items.length > 0 ? (
          <section className="sb-flatlay">
            {items.map((item, i) => {
              const tilt = tiltFor(i);
              const dec = decorationFor(i);
              const isBuy = item.is_owned === false;
              const photoSrc = item.image_url || fallbackSvgFor(item.position);
              const altText = isBuy ? "" : item.name || item.position || "";
              return (
                <div key={item.id || `slot-${i}`} className="sb-flatlay__slot">
                  <Polaroid
                    tilt={tilt}
                    caption={captionFor(item)}
                    className={isBuy ? "sb-polaroid--placeholder" : ""}
                    {...dec}
                  >
                    <img src={photoSrc} alt={altText} />
                    {isBuy && <span className="sb-polaroid__badge">to buy</span>}
                  </Polaroid>
                  {item.annotation && (
                    <Annotation
                      side={i % 2 === 0 ? "right" : "left"}
                      colour="var(--sb-sepia)"
                    >
                      {item.annotation}
                    </Annotation>
                  )}
                </div>
              );
            })}
            {outfit.sticky_note && (
              <div className="sb-flatlay__sticky">
                <StickyNote tilt={3}>{outfit.sticky_note}</StickyNote>
              </div>
            )}
          </section>
        ) : (
          <section style={{
            margin: "32px 0 0", padding: "28px 24px",
            background: "var(--sb-paper-card)",
            border: "1px dashed var(--sb-sepia-soft)",
            textAlign: "center",
          }}>
            <p className="sb-body" style={{ margin: 0 }}>
              {outfit.item_count || 0} {outfit.item_count === 1 ? "piece" : "pieces"} in this composition.
            </p>
            <Link
              to={outfit.scenario_id ? `/scenario/${outfit.scenario_id}` : "/"}
              style={{
                display: "inline-block", marginTop: 10,
                fontFamily: "var(--sb-font-hand)", fontSize: 17,
                color: "var(--sb-sepia)",
                textDecoration: "underline wavy",
                textUnderlineOffset: 4,
              }}
            >Open the scenario to see the full read →</Link>
          </section>
        )}

        {outfit.rationale && (
          <section className="sb-detail__why">
            <h2 className="sb-display sb-display-md">Why this works</h2>
            <p className="sb-body sb-body-drop">{outfit.rationale}</p>
          </section>
        )}

        {showStockists && (
          <section className="sb-stockists">
            <header className="sb-stockists__head">
              <h3 className="sb-stockists__title">Stockists</h3>
              <span className="sb-stockists__sub">
                Sourced via <span className="sb-stockists__amz">Amazon</span> · live links
              </span>
            </header>
            <ul className="sb-stockists__list">
              {gapItems.map((item, i) => (
                <li key={item.id || `gap-${i}`} className="sb-stockists__row">
                  <div className="sb-stockists__thumb">
                    {item.affiliate_image ? (
                      <img src={item.affiliate_image} alt="" />
                    ) : (
                      <span style={{
                        fontFamily: "var(--sb-font-hand)",
                        color: "var(--sb-sepia)", fontSize: 14, lineHeight: 1,
                      }}>·</span>
                    )}
                  </div>
                  <div className="sb-stockists__name">
                    {item.name || "To source"}
                    {item.position && <span className="sb-stockists__pos">{item.position}</span>}
                  </div>
                  {item.affiliate_url && (
                    <a
                      href={item.affiliate_url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="sb-stockists__link"
                    >Buy →</a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section style={{
          marginTop: 36, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
        }}>
          {outfit.is_saved ? (
            <>
              <span style={{
                fontFamily: "var(--sb-font-display)", fontSize: 15,
                letterSpacing: "0.04em",
                padding: "14px 24px",
                border: "1.4px dashed var(--sb-sage)",
                color: "var(--sb-sage)",
              }}>✓ Saved</span>
              <button
                type="button"
                onClick={unsave}
                style={{
                  background: "none", border: 0, padding: 0,
                  fontFamily: "var(--sb-font-hand)", fontSize: 17,
                  color: "var(--sb-sepia)",
                  textDecoration: "underline wavy",
                  textUnderlineOffset: 4,
                  cursor: "pointer",
                }}
              >Remove from saved</button>
            </>
          ) : (
            <button
              type="button"
              onClick={save}
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
            >Save this look</button>
          )}

          {outfit.scenario_id && (
            <Link
              to={`/scenario/${outfit.scenario_id}`}
              style={{
                background: "transparent",
                padding: "14px 28px",
                border: "1.4px solid var(--sb-charcoal)",
                fontFamily: "var(--sb-font-display)", fontSize: 15,
                letterSpacing: "0.02em",
                color: "var(--sb-charcoal)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--sb-charcoal)";
                e.currentTarget.style.color = "var(--sb-paper)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--sb-charcoal)";
              }}
            >See another composition →</Link>
          )}
        </section>

        {showStockists && (
          <p className="sb-detail__disclosure">
            As an Amazon Associate, Seynario earns from qualifying purchases.
          </p>
        )}
      </main>
    </Shell>
  );
}


function Shell({ children }) {
  return (
    <SketchbookPage>
      <Masthead
        title="SEYNARIO"
        eyebrow="Saved look"
        right={<Link to="/">← Home</Link>}
      />
      {children}
    </SketchbookPage>
  );
}


function CenteredMessage({ children, tone }) {
  const colour = tone === "error" ? "#b3361f" : undefined;
  return (
    <p className="sb-body" style={{ padding: 60, textAlign: "center", color: colour }}>
      {children}
    </p>
  );
}


function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  }).format(d);
}
