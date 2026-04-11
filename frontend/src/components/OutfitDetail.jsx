import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";

export default function OutfitDetail() {
  const { outfitId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [outfit, setOutfit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      try {
        const outfits = await api.get("/api/outfits/", token);
        const found = outfits.find(o => o.id === outfitId);
        if (found) setOutfit(found);
      } catch (e) {
        console.error("Failed to load outfit:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [outfitId]);

  const unsave = async () => {
    const token = getToken();
    try {
      await api.delete(`/api/outfits/${outfitId}/save`, token);
      navigate("/");
    } catch (e) {
      console.error("Failed to unsave:", e);
    }
  };

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading...</div>;
  if (!outfit) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Outfit not found</div>;

  return (
    <div style={{ minHeight: "100vh", padding: "0 22px 40px" }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 500px 350px at 15% 15%, rgba(196,149,106,0.06), transparent)",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "22px 0 18px" }}>
          <button onClick={() => navigate("/")} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            cursor: "pointer", fontSize: 13.5, padding: "4px 0", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)",
          }}>← Back</button>

          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{outfit.name || "Saved Outfit"}</h2>
          <p style={{ fontSize: 12.5, color: "var(--accent)", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>
            {outfit.item_count} items · Saved
          </p>
        </div>

        <div style={{
          padding: "18px 20px", borderRadius: 16,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.05)",
          animation: "slideUp 0.4s ease-out",
        }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.6, fontStyle: "italic" }}>
            Saved on {new Date(outfit.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <button onClick={unsave} style={{
            width: "100%", padding: "11px 0", borderRadius: 10,
            background: "rgba(226,75,74,0.12)", border: "1px solid rgba(226,75,74,0.25)",
            color: "#e24b4a", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>Remove from saved</button>
        </div>
      </div>
    </div>
  );
}