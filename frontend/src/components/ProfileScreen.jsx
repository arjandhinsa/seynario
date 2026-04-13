import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";

const BODY_TYPES = ["Slim", "Athletic", "Average", "Curvy", "Plus-size"];
const STYLE_PREFS = ["Minimal", "Classic", "Smart-casual", "Streetwear", "Preppy", "Bohemian", "Edgy"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [bodyType, setBodyType] = useState("");
  const [stylePref, setStylePref] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      try {
        const user = await api.get("/api/auth/me", token);
        if (user.body_type) setBodyType(user.body_type);
        if (user.style_pref) setStylePref(user.style_pref);
        if (user.gender) setGender(user.gender);
      } catch (e) {
        console.error("Failed to load profile:", e);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const token = getToken();
    try {
      await api.put("/api/auth/me", {
        body_type: bodyType || null,
        style_pref: stylePref || null,
        gender: gender || null,
      }, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  };

  const chipStyle = (selected) => ({
    padding: "8px 16px", borderRadius: 20,
    background: selected ? "rgba(196,149,106,0.15)" : "rgba(255,255,255,0.025)",
    border: `1px solid ${selected ? "rgba(196,149,106,0.4)" : "rgba(255,255,255,0.06)"}`,
    color: selected ? "var(--accent-light)" : "var(--text-muted)",
    fontSize: 13, fontWeight: 500, cursor: "pointer",
    transition: "all 0.2s",
  });

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
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Your Style Profile</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.5 }}>
            Tell us about yourself so Seynario can give you better outfit recommendations.
          </p>
        </div>

        {/* Gender */}
        <div style={{ marginBottom: 28, animation: "slideUp 0.4s ease-out" }}>
          <h3 style={{
            fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)",
            letterSpacing: 2, textTransform: "uppercase", marginBottom: 12,
          }}>I identify as</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GENDERS.map(g => (
              <button key={g} onClick={() => setGender(g.toLowerCase())}
                style={chipStyle(gender === g.toLowerCase())}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Body type */}
        <div style={{ marginBottom: 28, animation: "slideUp 0.4s ease-out 0.1s both" }}>
          <h3 style={{
            fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)",
            letterSpacing: 2, textTransform: "uppercase", marginBottom: 12,
          }}>Body type</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {BODY_TYPES.map(b => (
              <button key={b} onClick={() => setBodyType(b.toLowerCase())}
                style={chipStyle(bodyType === b.toLowerCase())}>
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Style preference */}
        <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out 0.2s both" }}>
          <h3 style={{
            fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)",
            letterSpacing: 2, textTransform: "uppercase", marginBottom: 12,
          }}>Style preference</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STYLE_PREFS.map(s => (
              <button key={s} onClick={() => setStylePref(s.toLowerCase())}
                style={chipStyle(stylePref === s.toLowerCase())}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving} style={{
          width: "100%", padding: "14px 0", borderRadius: 12,
          background: saved ? "rgba(90,180,90,0.15)" : "var(--accent)",
          border: saved ? "1px solid rgba(90,180,90,0.3)" : "none",
          color: saved ? "#7dce82" : "#fff",
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          transition: "all 0.3s",
          animation: "slideUp 0.4s ease-out 0.3s both",
        }}>
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save profile"}
        </button>
      </div>
    </div>
  );
}