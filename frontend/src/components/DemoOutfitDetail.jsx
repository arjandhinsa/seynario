import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { SketchbookPage, Masthead, Polaroid, Annotation, StickyNote } from "./sketchbook";


const TILTS = [-3, 2.4, -1.6, 1.8, -2.2, 2.6];
const WASHIS = ["coral", "mustard", null, "blue", null, "coral"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];


export default function DemoOutfitDetail() {
  const { scenarioId } = useParams();
  const [data, setData] = useState(null);
  const [variantIdx, setVariantIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) return <Shell><CenteredMessage>Loading…</CenteredMessage></Shell>;
  if (error) return <Shell><CenteredMessage tone="error">Couldn't load this scenario: {error}</CenteredMessage></Shell>;

  const outfits = data?.outfits ?? [];
  if (!data || outfits.length === 0) {
    return <Shell><CenteredMessage>Nothing cached for this scenario yet.</CenteredMessage></Shell>;
  }

  const { scenario } = data;
  const current = outfits[variantIdx];

  return (
    <Shell>
      <main className="sb-detail">
        <section className="sb-detail__head">
          <div className="sb-eyebrow">Look n° {variantIdx + 1} of {outfits.length}</div>
          <h1 className="sb-display sb-display-xl">{scenario.name}</h1>
          {scenario.description && (
            <p className="sb-detail__lede">{scenario.description}</p>
          )}
        </section>

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
            const tilt = TILTS[i % TILTS.length];
            const washiSlot = WASHIS[i % WASHIS.length];
            const usePin = washiSlot === null;
            return (
              <div key={`${item.id}-${i}`} className="sb-flatlay__slot">
                <Polaroid
                  tilt={tilt}
                  caption={item.name ? item.name.toLowerCase() : undefined}
                  washi={usePin ? null : washiSlot}
                  pin={usePin}
                >
                  <img src={item.svg_path} alt={item.name} />
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
          {current.sticky_note && (
            <div className="sb-flatlay__sticky">
              <StickyNote tilt={3}>{current.sticky_note}</StickyNote>
            </div>
          )}
        </section>

        <section className="sb-detail__why">
          <h2 className="sb-display sb-display-md">Why this works</h2>
          <p className="sb-body sb-body-drop">{current.rationale}</p>
        </section>

        <section className="sb-stockists">
          <header className="sb-stockists__head">
            <h3 className="sb-stockists__title">Stockists</h3>
            <span className="sb-stockists__sub">
              Sourced via <span className="sb-stockists__amz">Amazon</span> · live links
            </span>
          </header>
          <ul className="sb-stockists__list">
            {current.items.map((item, i) => (
              <li key={`${item.id}-stk-${i}`} className="sb-stockists__row">
                <div className="sb-stockists__thumb">
                  <img src={item.svg_path} alt="" />
                </div>
                <div className="sb-stockists__name">
                  {item.name}
                  {item.position && <span className="sb-stockists__pos">{item.position}</span>}
                </div>
                <a
                  href={item.redirect_url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="sb-stockists__link"
                >Find on Amazon →</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="sb-detail__cta">
          <h3 className="sb-display sb-display-md">Use this with your own wardrobe.</h3>
          <p className="sb-body">
            Scan in what you already own. Get the same kind of read on every outfit you wear.
          </p>
          <Link to="/" className="sb-detail__signup">Sign up for your own wardrobe →</Link>
        </section>

        <p className="sb-detail__disclosure">
          As an Amazon Associate, Seynario earns from qualifying purchases.
        </p>
      </main>
    </Shell>
  );
}


function Shell({ children }) {
  return (
    <SketchbookPage>
      <Masthead
        title="SEYNARIO"
        eyebrow="Sample wardrobe demo"
        right={<Link to="/demo">← All scenarios</Link>}
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
