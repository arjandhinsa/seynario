import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";

export default function ScenarioScreen() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [scenario, setScenario] = useState(null);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentOutfit, setCurrentOutfit] = useState(0);

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
    return <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (!scenario) {
    return <div style={{ padding: 40, color: "var(--text-muted)" }}>Scenario not found</div>;
  }

  return (
    <div style={{ minHeight: "100vh", padding: "0 22px 40px" }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 500px 350px at 15% 15%, rgba(196,149,106,0.06), transparent)",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: "22px 0 18px" }}>
          <button onClick={() => navigate("/")} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            cursor: "pointer", fontSize: 13.5, padding: "4px 0", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)",
          }}>← Back</button>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 36 }}>{scenario.icon}</span>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{scenario.name}</h2>
              <p style={{ fontSize: 12.5, color: "var(--accent)", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>
                Formality {scenario.formality_min}-{scenario.formality_max}/5
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "14px 0 0", lineHeight: 1.6 }}>
            {scenario.description}
          </p>
        </div>

        {/* Generate button */}
        {outfits.length === 0 && !generating && (
          <button onClick={generateOutfits} style={{
            width: "100%", padding: "16px 0", borderRadius: 14,
            background: "var(--accent)", border: "none",
            color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: "pointer", marginTop: 10, marginBottom: 20,
            animation: "slideUp 0.5s ease-out",
          }}>
            Style me for this scenario
          </button>
        )}

        {/* Generating state */}
        {generating && (
          <div style={{
            padding: "50px 20px", borderRadius: 18,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            textAlign: "center", marginTop: 10,
            animation: "fadeIn 0.3s ease-out",
          }}>
            <div style={{ fontSize: 42, marginBottom: 16, animation: "pulse 2s ease-in-out infinite" }}>👔</div>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Styling your outfits...</p>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>AI is matching your wardrobe to this scenario</p>
          </div>
        )}

        {/* Outfit results */}
        {outfits.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 14,
            }}>
              <h3 style={{
                fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)",
                letterSpacing: 2, textTransform: "uppercase", margin: 0,
              }}>Outfit {currentOutfit + 1} of {outfits.length}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setCurrentOutfit(Math.max(0, currentOutfit - 1))}
                  disabled={currentOutfit === 0}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: currentOutfit === 0 ? "rgba(255,255,255,0.15)" : "var(--text-primary)",
                    fontSize: 14, cursor: currentOutfit === 0 ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>←</button>
                <button onClick={() => setCurrentOutfit(Math.min(outfits.length - 1, currentOutfit + 1))}
                  disabled={currentOutfit === outfits.length - 1}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: currentOutfit === outfits.length - 1 ? "rgba(255,255,255,0.15)" : "var(--text-primary)",
                    fontSize: 14, cursor: currentOutfit === outfits.length - 1 ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>→</button>
              </div>
            </div>

            {(() => {
              const outfit = outfits[currentOutfit];
              const top = outfit.items.find(i => i.position === "top");
              const bottom = outfit.items.find(i => i.position === "bottom");
              const outerwear = outfit.items.find(i => i.position === "outerwear");
              const footwear = outfit.items.find(i => i.position === "footwear" || i.position === "shoes");
              const accessories = outfit.items.filter(i => i.position === "accessory");
              const others = outfit.items.filter(i =>
                !["top","bottom","outerwear","footwear","shoes","accessory"].includes(i.position)
              );

              const renderItem = (item, size = "medium") => {
                const sizes = {
                  large: { width: "100%", height: 180 },
                  medium: { width: "100%", height: 140 },
                  small: { width: "100%", height: 100 },
                };
                const s = sizes[size];
                return (
                  <div key={item.id} style={{
                    width: s.width, height: s.height,
                    borderRadius: 14, overflow: "hidden", position: "relative",
                  }}>
                    {item.image_url ? (
                      <div style={{
                        width: "100%", height: "100%",
                        backgroundImage: `url(${item.image_url})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                      }} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        background: "linear-gradient(135deg, rgba(196,149,106,0.12), rgba(196,149,106,0.03))",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        padding: 12, textAlign: "center",
                        gap: 6,
                      }}>
                        <span style={{ fontSize: 28 }}>🛍️</span>
                        <span style={{
                          fontSize: 11, color: "var(--accent-light)", fontWeight: 600,
                          lineHeight: 1.4, maxWidth: "90%",
                        }}>{item.name || "Suggested item"}</span>
                        {item.affiliate_url && (
                          <a href={item.affiliate_url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontSize: 10, padding: "4px 10px", borderRadius: 6,
                              background: "var(--accent)", color: "#fff",
                              textDecoration: "none", fontWeight: 600, marginTop: 2,
                            }}>Shop on Amazon</a>
                        )}
                      </div>
                    )}
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      fontSize: 9, padding: "3px 7px", borderRadius: 4,
                      background: item.is_owned ? "rgba(90,180,90,0.5)" : "rgba(196,149,106,0.5)",
                      color: "#fff", fontWeight: 700, letterSpacing: 0.5,
                      backdropFilter: "blur(4px)",
                    }}>
                      {item.is_owned ? "OWNED" : "BUY"}
                    </div>
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      padding: "14px 10px 6px",
                      background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                    }}>
                      <span style={{ fontSize: 10, color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                        {item.position}
                      </span>
                    </div>
                  </div>
                );
              };

              return (
                <div style={{
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  overflow: "hidden",
                  animation: "fadeIn 0.3s ease-out",
                }}>
                  {/* Vision board canvas */}
                  <div style={{
                    padding: 12,
                    background: "rgba(0,0,0,0.15)",
                  }}>
                    {/* Top row — outerwear + top */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      {outerwear && <div style={{ flex: 1 }}>{renderItem(outerwear, "medium")}</div>}
                      {top && <div style={{ flex: 1 }}>{renderItem(top, outerwear ? "medium" : "large")}</div>}
                      {!outerwear && !top && others[0] && <div style={{ flex: 1 }}>{renderItem(others[0], "large")}</div>}
                    </div>

                    {/* Bottom row — bottom + footwear */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {bottom && <div style={{ flex: 1 }}>{renderItem(bottom, "medium")}</div>}
                      {footwear && <div style={{ flex: 1 }}>{renderItem(footwear, "medium")}</div>}
                    </div>

                    {/* Accessories */}
                    {accessories.length > 0 && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        {accessories.map(a => (
                          <div key={a.id} style={{ flex: 1 }}>{renderItem(a, "small")}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Outfit info */}
                  <div style={{ padding: "20px 20px" }}>
                    <h4 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 10px" }}>{outfit.name}</h4>
                    <p style={{
                      fontSize: 13, color: "var(--text-muted)", margin: "0 0 18px",
                      lineHeight: 1.65, fontStyle: "italic",
                      borderLeft: "2px solid var(--accent)",
                      paddingLeft: 14,
                    }}>
                      {outfit.rationale}
                    </p>

                    {/* Item list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                      {outfit.items.map(item => (
                        <div key={item.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 10,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}>
                          {item.image_url ? (
                            <div style={{
                              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                              backgroundImage: `url(${item.image_url})`,
                              backgroundSize: "cover", backgroundPosition: "center",
                            }} />
                          ) : (
                            <div style={{
                              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                              background: "rgba(196,149,106,0.1)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14,
                            }}>🛍️</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: 12.5, fontWeight: 500, margin: 0,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>{item.name || item.position}</p>
                            <p style={{ fontSize: 10.5, color: "var(--text-muted)", margin: "2px 0 0" }}>
                              {item.is_owned ? "From your wardrobe" : "Suggested purchase"}
                            </p>
                          </div>
                          {!item.is_owned && item.affiliate_url && (
                            <a href={item.affiliate_url} target="_blank" rel="noopener noreferrer" style={{
                              fontSize: 11, padding: "5px 12px", borderRadius: 6,
                              background: "var(--accent)", color: "#fff",
                              textDecoration: "none", fontWeight: 600, flexShrink: 0,
                            }}>Shop</a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 10 }}>
                      {outfit.is_saved ? (
                        <span style={{
                          flex: 1, textAlign: "center", padding: "11px 0",
                          fontSize: 13, color: "var(--accent)", fontWeight: 600,
                          fontFamily: "var(--font-mono)",
                        }}>✓ Saved</span>
                      ) : (
                        <button onClick={() => saveOutfit(outfit.id)} style={{
                          flex: 1, padding: "11px 0", borderRadius: 10,
                          background: "rgba(196,149,106,0.12)",
                          border: "1px solid rgba(196,149,106,0.25)",
                          color: "var(--accent-light)", fontSize: 13, fontWeight: 600,
                          cursor: "pointer",
                        }}>Save outfit</button>
                      )}
                      {currentOutfit < outfits.length - 1 && (
                        <button onClick={() => setCurrentOutfit(currentOutfit + 1)} style={{
                          flex: 1, padding: "11px 0", borderRadius: 10,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-primary)", fontSize: 13, fontWeight: 500,
                          cursor: "pointer",
                        }}>Next outfit →</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button onClick={() => { generateOutfits(); setCurrentOutfit(0); }} style={{
              width: "100%", padding: "13px 0", borderRadius: 12, marginTop: 18,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-primary)", fontSize: 14, fontWeight: 500,
              cursor: "pointer",
            }}>Generate new outfits</button>
          </div>
        )}
      </div>
    </div>
  );
}