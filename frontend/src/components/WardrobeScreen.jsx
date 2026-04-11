import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";

const CATEGORIES = [
  { key: null, label: "All" },
  { key: "top", label: "Tops" },
  { key: "bottom", label: "Bottoms" },
  { key: "outerwear", label: "Outerwear" },
  { key: "footwear", label: "Footwear" },
  { key: "accessory", label: "Accessories" },
];

export default function WardrobeScreen() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [garments, setGarments] = useState([]);
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      try {
        const data = await api.get("/api/wardrobe/", token);
        setGarments(data);
      } catch (e) {
        console.error("Failed to load wardrobe:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (id) => {
    const token = getToken();
    try {
      await api.delete(`/api/wardrobe/${id}`, token);
      setGarments(prev => prev.filter(g => g.id !== id));
      setSelected(null);
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const filtered = filter
    ? garments.filter(g => g.category === filter)
    : garments;

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Your Wardrobe</h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>
                {garments.length} {garments.length === 1 ? "item" : "items"}
              </p>
            </div>
            <button onClick={() => navigate("/scan")} style={{
              background: "var(--accent)", border: "none",
              color: "#fff", borderRadius: 10, padding: "8px 16px",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>+ Scan</button>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 7, marginBottom: 20, flexWrap: "wrap" }}>
          {CATEGORIES.map(c => (
            <button key={c.label} onClick={() => setFilter(c.key)} style={{
              padding: "5px 13px", borderRadius: 18,
              background: filter === c.key ? "rgba(196,149,106,0.15)" : "rgba(255,255,255,0.025)",
              border: `1px solid ${filter === c.key ? "rgba(196,149,106,0.35)" : "rgba(255,255,255,0.05)"}`,
              color: filter === c.key ? "var(--accent-light)" : "var(--text-muted)",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}>{c.label}</button>
          ))}
        </div>

        {/* Garment grid */}
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {filter ? "No items in this category" : "Your wardrobe is empty"}
            </p>
            <button onClick={() => navigate("/scan")} style={{
              marginTop: 12, background: "var(--accent)", border: "none",
              color: "#fff", borderRadius: 10, padding: "10px 20px",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Scan your first item</button>
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}>
            {filtered.map((g, i) => (
              <div
                key={g.id}
                onClick={() => setSelected(selected?.id === g.id ? null : g)}
                style={{
                  aspectRatio: "1", borderRadius: 14,
                  backgroundImage: `url(${g.image_url})`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  border: selected?.id === g.id
                    ? "2px solid var(--accent)"
                    : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  animation: `fadeSlideIn 0.3s ease-out ${i * 0.03}s both`,
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "20px 8px 8px",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                }}>
                  <p style={{ fontSize: 10.5, color: "#fff", margin: 0, fontWeight: 500 }}>
                    {g.colour} {g.subcategory || g.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected garment modal */}
{selected && (
  <div
    onClick={() => setSelected(null)}
    style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10, padding: 24,
      animation: "fadeIn 0.2s ease-out",
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        width: "100%", maxWidth: 340, borderRadius: 20,
        background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <div style={{
        width: "100%", height: 260,
        backgroundImage: `url(${selected.image_url})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
      <div style={{ padding: "18px 20px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
          {selected.colour} {selected.subcategory || selected.category}
        </h3>
        {selected.ai_description && (
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
            {selected.ai_description}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {selected.material && (
            <span style={{
              padding: "4px 10px", borderRadius: 16, fontSize: 11,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-muted)",
            }}>{selected.material}</span>
          )}
          {selected.pattern && (
            <span style={{
              padding: "4px 10px", borderRadius: 16, fontSize: 11,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-muted)",
            }}>{selected.pattern}</span>
          )}
          {selected.season && (
            <span style={{
              padding: "4px 10px", borderRadius: 16, fontSize: 11,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-muted)",
            }}>{selected.season}</span>
          )}
          {selected.formality && (
            <span style={{
              padding: "4px 10px", borderRadius: 16, fontSize: 11,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-muted)",
            }}>Formality {selected.formality}/5</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setSelected(null)} style={{
            flex: 1, padding: "11px 0", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-primary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>Close</button>
          <button onClick={() => handleDelete(selected.id)} style={{
            flex: 1, padding: "11px 0", borderRadius: 10,
            background: "rgba(226,75,74,0.12)", border: "1px solid rgba(226,75,74,0.25)",
            color: "#e24b4a", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>Delete item</button>
        </div>
      </div>
    </div>
  </div>
)}

</div>
    </div>
  );
}
