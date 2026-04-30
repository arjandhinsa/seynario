import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";
import { SketchbookPage, Masthead } from "./sketchbook";


const CATEGORIES = ["professional", "social", "formal", "casual"];


export default function HomeScreen() {
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const [garments, setGarments] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      try {
        const [g, s, o] = await Promise.all([
          api.get("/api/wardrobe/", token),
          api.get("/api/scenarios/", token),
          api.get("/api/outfits/?saved=true", token),
        ]);
        setGarments(g);
        setScenarios(s);
        setSavedOutfits(o);
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const scenariosById = useMemo(
    () => Object.fromEntries(scenarios.map(s => [s.id, s])),
    [scenarios],
  );

  const recentOutfit = savedOutfits[0];
  const recentScenario = recentOutfit ? scenariosById[recentOutfit.scenario_id] : null;
  const briefLabel = isEvening() ? "TONIGHT'S BRIEF" : "TODAY'S BRIEF";

  return (
    <SketchbookPage>
      <Masthead
        title="SEYNARIO"
        eyebrow={formatToday()}
        right={<Avatar user={user} />}
      />

      <main className="sb-detail">
        {recentScenario && (
          <header className="sb-detail__head">
            <div className="sb-eyebrow">{briefLabel}</div>
            <h1 className="sb-display sb-display-xl">{recentScenario.name}</h1>
            {recentScenario.description && (
              <p className="sb-detail__lede">{recentScenario.description}</p>
            )}
          </header>
        )}

        {recentOutfit && (
          <section id="saved-looks" style={{ padding: "28px 0 8px", scrollMarginTop: 24 }}>
            <Link
              to={`/outfit/${recentOutfit.id}`}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "18px 20px",
                background: "var(--sb-paper-card)",
                border: "1px solid var(--sb-paper-edge)",
                color: "var(--sb-charcoal)", textDecoration: "none",
                boxShadow: "var(--sb-shadow-card)",
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>
                {recentScenario?.icon || "·"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "var(--sb-font-display)", fontSize: 18, fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}>
                  {recentOutfit.name || "Saved look"}
                </div>
                <div style={{
                  fontFamily: "var(--sb-font-body)", fontSize: 12,
                  color: "var(--sb-charcoal-soft)", marginTop: 4,
                  letterSpacing: "0.04em",
                }}>
                  {formatDate(recentOutfit.created_at)} · {recentOutfit.item_count} {recentOutfit.item_count === 1 ? "piece" : "pieces"}
                </div>
              </div>
              <span style={{
                fontFamily: "var(--sb-font-body)", fontSize: 11,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--sb-sepia)",
              }}>Open →</span>
            </Link>
          </section>
        )}

        {savedOutfits.length > 1 && (
          <section className="sb-detail__why" style={{ paddingTop: 32 }}>
            <h2 className="sb-display sb-display-md">Recent briefs</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {savedOutfits.slice(1, 6).map((o) => {
                const sc = scenariosById[o.scenario_id];
                return (
                  <li key={o.id}>
                    <Link
                      to={`/outfit/${o.id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        gap: 16, alignItems: "baseline",
                        padding: "14px 0",
                        borderBottom: "1px dashed rgba(139, 111, 71, 0.32)",
                        color: "var(--sb-charcoal)",
                        textDecoration: "none",
                      }}
                    >
                      <span style={{
                        fontFamily: "var(--sb-font-body)", fontSize: 11,
                        letterSpacing: "0.18em", textTransform: "uppercase",
                        color: "var(--sb-sepia)", minWidth: 88,
                      }}>{formatDate(o.created_at)}</span>
                      <span style={{
                        fontFamily: "var(--sb-font-display)", fontSize: 17,
                        letterSpacing: "-0.01em",
                      }}>{sc?.name || o.name || "Saved look"}</span>
                      <span style={{
                        fontFamily: "var(--sb-font-body)", fontSize: 12,
                        color: "var(--sb-charcoal-soft)",
                      }}>{o.item_count} pcs</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section id="compose" className="sb-detail__head" style={{ paddingTop: recentScenario ? 36 : 0 }}>
          <h2 className="sb-display sb-display-xl">What are you dressing for?</h2>
          <p className="sb-detail__lede">
            Pick an occasion. We'll dress you from your wardrobe.
            <br />
            Saved looks stay here.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", marginTop: 22 }}>
            {savedOutfits.length > 0 && (
              <a
                href="#saved-looks"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("saved-looks")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  display: "inline-block",
                  padding: "16px 28px",
                  border: "1.4px solid var(--sb-charcoal)",
                  background: "transparent",
                  fontFamily: "var(--sb-font-display)",
                  fontSize: 16, letterSpacing: "0.02em",
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
              >
                Saved looks →
              </a>
            )}
            <Link
              to="/scan"
              style={{
                color: "var(--sb-charcoal)", fontFamily: "var(--sb-font-display)", fontSize: 17,
                textDecoration: "underline wavy", textDecorationColor: "var(--sb-terracotta)", textUnderlineOffset: 4,
              }}
            >
              Upload your wardrobe →
            </Link>
          </div>

          {loading ? (
            <p className="sb-body" style={{ padding: "24px 0" }}>Loading…</p>
          ) : (
            <div id="picker" style={{ marginTop: 32, scrollMarginTop: 24 }}>
              {CATEGORIES.map((cat) => {
                const filtered = scenarios.filter((s) => s.category === cat);
                if (filtered.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: 26 }}>
                    <div className="sb-eyebrow" style={{ marginBottom: 10 }}>{cat}</div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {filtered.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (garments.length === 0) {
                                alert("Scan some wardrobe items first!");
                                return;
                              }
                              navigate(`/scenario/${s.id}`);
                            }}
                            style={{
                              width: "100%", display: "grid",
                              gridTemplateColumns: "auto 1fr auto",
                              gap: 14, alignItems: "center",
                              padding: "14px 0",
                              borderBottom: "1px dashed rgba(139, 111, 71, 0.32)",
                              background: "none", border: 0,
                              borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                              textAlign: "left", color: "var(--sb-charcoal)",
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            <span style={{ fontSize: 22, lineHeight: 1 }}>{s.icon}</span>
                            <span>
                              <span style={{
                                display: "block",
                                fontFamily: "var(--sb-font-display)", fontSize: 17,
                                letterSpacing: "-0.01em",
                              }}>{s.name}</span>
                              <span style={{
                                display: "block",
                                fontFamily: "var(--sb-font-body)", fontSize: 13,
                                color: "var(--sb-charcoal-soft)", marginTop: 3,
                                lineHeight: 1.4,
                              }}>{s.description}</span>
                            </span>
                            <span style={{
                              fontFamily: "var(--sb-font-body)", fontSize: 11,
                              letterSpacing: "0.18em", textTransform: "uppercase",
                              color: "var(--sb-sepia)",
                            }}>Compose →</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </SketchbookPage>
  );
}


function Avatar({ user }) {
  const initials = deriveInitials(user);
  return (
    <Link
      to="/profile"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: "50%",
        background: "rgba(232, 223, 205, 0.10)",
        color: "#FAF5EC",
        fontFamily: "var(--sb-font-display)", fontSize: 12,
        letterSpacing: "0.04em",
        textDecoration: "none",
        border: "1px solid rgba(232, 223, 205, 0.22)",
      }}
      aria-label={user?.display_name || user?.email || "Profile"}
    >
      {initials}
    </Link>
  );
}


function deriveInitials(user) {
  if (!user) return "·";
  const source = user.display_name || user.email || "";
  const parts = source.split(/[\s._-]+|@/).filter(Boolean);
  if (parts.length === 0) return "·";
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).filter(Boolean).join("");
  return letters || "·";
}


function isEvening() {
  return new Date().getHours() >= 17;
}


function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  }).format(new Date());
}


function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short",
  }).format(d);
}
