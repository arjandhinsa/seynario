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
      console.error("Failed to generate outfits:", e);
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
            <h3 style={{
              fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)",
              letterSpacing: 2, textTransform: "uppercase", marginBottom: 14,
            }}>Recommended outfits</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {outfits.map((outfit, i) => (
                <div key={outfit.id} style={{
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  overflow: "hidden",
                  animation: `slideUp 0.5s ease-out ${i * 0.1}s both`,
                }}>
                  {/* Outfit items images */}
                  <div style={{
                    display: "flex", gap: 2, height: 140, overflow: "hidden",
                  }}>
                    {outfit.items.filter(item => item.image_url).map(item => (
                      <div key={item.id} style={{
                        flex: 1,
                        backgroundImage: `url(${item.image_url})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                      }} />
                    ))}
                    {outfit.items.filter(item => !item.image_url).length > 0 && (
                      <div style={{
                        flex: 1, background: "rgba(255,255,255,0.03)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexDirection: "column", gap: 4,
                      }}>
                        <span style={{ fontSize: 20 }}>🛍️</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {outfit.items.filter(item => !item.image_url).length} to buy
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "16px 18px" }}>
                    <h4 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>{outfit.name}</h4>
                    <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.55 }}>
                      {outfit.rationale}
                    </p>

                    {/* Item list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                      {outfit.items.map(item => (
                        <div key={item.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px", borderRadius: 10,
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
                            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                              {item.is_owned ? "From your wardrobe" : "Suggested purchase"}
                            </p>
                          </div>
                          <span style={{
                            fontSize: 10, fontFamily: "var(--font-mono)",
                            color: item.is_owned ? "var(--accent)" : "var(--text-muted)",
                            padding: "3px 8px", borderRadius: 6,
                            background: item.is_owned ? "rgba(196,149,106,0.1)" : "rgba(255,255,255,0.03)",
                          }}>{item.position}</span>
                        </div>
                      ))}
                    </div>

                    {/* Save button */}
                    {outfit.is_saved ? (
                      <span style={{
                        fontSize: 12, color: "var(--accent)", fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                      }}>✓ Saved</span>
                    ) : (
                      <button onClick={() => saveOutfit(outfit.id)} style={{
                        width: "100%", padding: "10px 0", borderRadius: 10,
                        background: "rgba(196,149,106,0.12)",
                        border: "1px solid rgba(196,149,106,0.25)",
                        color: "var(--accent-light)", fontSize: 13, fontWeight: 600,
                        cursor: "pointer",
                      }}>Save this outfit</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Generate more */}
            <button onClick={generateOutfits} style={{
              width: "100%", padding: "13px 0", borderRadius: 12, marginTop: 16,
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