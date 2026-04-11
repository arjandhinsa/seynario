import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api";

export default function ScanScreen() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setScanning(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getToken();
      const garment = await api.upload("/api/wardrobe/scan", formData, token);
      setResult(garment);
    } catch (e) {
      setError(e.message || "Failed to scan. Try a JPG or PNG image.");
    } finally {
      setScanning(false);
    }
  };

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
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Scan an item</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0" }}>
            Take a photo or upload an image of a clothing item
          </p>
        </div>

        {/* Upload area */}
        {!result && !scanning && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              marginTop: 20, padding: "60px 20px", borderRadius: 18,
              border: "2px dashed rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.02)",
              textAlign: "center", cursor: "pointer",
              transition: "all 0.3s",
              animation: "fadeIn 0.5s ease-out",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Tap to upload a photo</p>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>JPG or PNG — take a clear photo of one item</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleScan}
              style={{ display: "none" }}
            />
          </div>
        )}

        {/* Scanning state */}
        {scanning && (
          <div style={{
            marginTop: 20, padding: "60px 20px", borderRadius: 18,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            textAlign: "center",
            animation: "fadeIn 0.3s ease-out",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 2s ease-in-out infinite" }}>🔍</div>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Identifying your garment...</p>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>AI is analysing the image</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 20, padding: "16px 20px", borderRadius: 14,
            background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.2)",
            animation: "fadeIn 0.3s ease-out",
          }}>
            <p style={{ fontSize: 13, color: "#e24b4a", margin: 0 }}>{error}</p>
            <button onClick={() => { setError(""); fileRef.current?.click(); }} style={{
              marginTop: 10, background: "none", border: "1px solid rgba(226,75,74,0.3)",
              color: "#e24b4a", borderRadius: 8, padding: "6px 14px",
              fontSize: 12, cursor: "pointer",
            }}>Try again</button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: 20, animation: "slideUp 0.5s ease-out" }}>
            {/* Image preview */}
            <div style={{
              width: "100%", height: 280, borderRadius: 18,
              backgroundImage: `url(${result.image_url})`,
              backgroundSize: "cover", backgroundPosition: "center",
              border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 20,
            }} />

            {/* Identified details */}
            <div style={{
              padding: "20px", borderRadius: 16,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 4px" }}>
                {result.colour} {result.subcategory || result.category}
              </h3>
              {result.ai_description && (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
                  {result.ai_description}
                </p>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.category && (
                  <span style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12,
                    background: "rgba(196,149,106,0.12)", border: "1px solid rgba(196,149,106,0.25)",
                    color: "var(--accent-light)",
                  }}>{result.category}</span>
                )}
                {result.material && (
                  <span style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                  }}>{result.material}</span>
                )}
                {result.pattern && (
                  <span style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                  }}>{result.pattern}</span>
                )}
                {result.season && (
                  <span style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                  }}>{result.season}</span>
                )}
                {result.formality && (
                  <span style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                  }}>Formality: {result.formality}/5</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => { setResult(null); fileRef.current?.click(); }} style={{
                flex: 1, padding: "13px 0", borderRadius: 12,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-primary)", fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}>Scan another</button>
              <button onClick={() => navigate("/")} style={{
                flex: 1, padding: "13px 0", borderRadius: 12,
                background: "var(--accent)", border: "none",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}