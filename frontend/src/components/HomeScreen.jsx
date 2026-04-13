import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { getToken, logout } = useAuth();
  const [garments, setGarments] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedOutfits, setSavedOutfits] = useState([]);

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

  const categories = ["professional", "social", "formal", "casual"];

  return (
    <div style={{ minHeight: "100vh", padding: "0 22px 40px" }}>
      {/* Ambient background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 500px 350px at 15% 15%, rgba(196,149,106,0.06), transparent), radial-gradient(ellipse 400px 400px at 85% 80%, rgba(160,120,90,0.04), transparent)",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: "36px 0 28px", animation: "fadeIn 0.7s ease-out" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: 4, textTransform: "uppercase" }}>SEYN</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => navigate("/profile")} style={{
                background: "none", border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--text-muted)", borderRadius: 8, padding: "5px 12px",
                fontSize: 11, cursor: "pointer",
              }}>Profile</button>
              <button onClick={logout} style={{
                background: "none", border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--text-muted)", borderRadius: 8, padding: "5px 12px",
                fontSize: 11, cursor: "pointer",
              }}>Log out</button>
            </div>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6, color: "var(--accent-light)" }}>Seynario</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: 1.5 }}>Dress for the scenario</p>
        </div>

        {/* Wardrobe section */}
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16, padding: "18px 20px", marginBottom: 24,
          animation: "slideUp 0.5s ease-out 0.15s both",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Your Wardrobe</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>
                {garments.length} {garments.length === 1 ? "item" : "items"} scanned
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {garments.length > 0 && (
                <button onClick={() => navigate("/wardrobe")} style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  color: "var(--text-muted)", borderRadius: 10, padding: "7px 14px",
                  fontSize: 12, cursor: "pointer",
                }}>View all</button>
              )}
              <button onClick={() => navigate("/scan")} style={{
                background: "var(--accent)", border: "none",
                color: "#fff", borderRadius: 10, padding: "7px 16px",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>+ Scan item</button>
            </div>
          </div>

          {garments.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Start by scanning a few items from your wardrobe and Seynario will identify them.
            </p>
          ) : (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {garments.slice(0, 6).map(g => (
                <div key={g.id} style={{
                  width: 72, height: 72, borderRadius: 10, flexShrink: 0,
                  backgroundImage: `url(${g.image_url})`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  border: "1px solid rgba(255,255,255,0.08)",
                }} />
              ))}
              {garments.length > 6 && (
                <div onClick={() => navigate("/wardrobe")} style={{
                  width: 72, height: 72, borderRadius: 10, flexShrink: 0,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "var(--text-muted)", cursor: "pointer",
                }}>+{garments.length - 6}</div>
              )}
            </div>
          )}
        </div>

        {/* Saved outfits */}
        {savedOutfits.length > 0 && (
        <div style={{
            marginBottom: 24,
            animation: "slideUp 0.5s ease-out 0.25s both",
        }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Saved Outfits</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {savedOutfits.map((o, i) => {
                const scenario = scenarios.find(s => s.id === o.scenario_id);
                return (
                <div
                    key={o.id}
                    onClick={() => navigate(`/outfit/${o.id}`)}
                    style={{
                    padding: "16px 18px", borderRadius: 14,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    animation: `fadeSlideIn 0.3s ease-out ${i * 0.05}s both`,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{scenario?.icon || "👔"}</span>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{o.name || "Saved outfit"}</h4>
                        <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                        {scenario?.name || "Custom outfit"} · {o.item_count} items
                        </p>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: 16 }}>→</span>
                    </div>
                </div>
                );
            })}
            </div>
        </div>
        )}

        {/* Scenarios */}
        <h2 style={{
          fontSize: 16, fontWeight: 600, marginBottom: 14,
          animation: "slideUp 0.5s ease-out 0.3s both",
        }}>What's the scenario?</h2>

        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>
        ) : (
          categories.map((cat, ci) => {
            const filtered = scenarios.filter(s => s.category === cat);
            if (filtered.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 22, animation: `slideUp 0.5s ease-out ${0.35 + ci * 0.08}s both` }}>
                <h3 style={{
                  fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)",
                  letterSpacing: 2, textTransform: "uppercase", marginBottom: 10,
                }}>{cat}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.map((s, i) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (garments.length === 0) {
                          alert("Scan some wardrobe items first!");
                          return;
                        }
                        navigate(`/scenario/${s.id}`);
                      }}
                      style={{
                        padding: "16px 18px", borderRadius: 14,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{s.icon}</span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{s.name}</h4>
                          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{s.description}</p>
                        </div>
                        <span style={{ color: "var(--text-muted)", fontSize: 16 }}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}