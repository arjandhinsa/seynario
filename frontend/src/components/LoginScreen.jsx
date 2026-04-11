import { useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";

export default function LoginScreen({ onSuccess }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return setError("Email and password are required");
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, displayName || null);
      } else {
        await login(email, password);
      }
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24,
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 500px 350px at 20% 20%, rgba(196,149,106,0.06), transparent), radial-gradient(ellipse 400px 400px at 80% 80%, rgba(160,120,90,0.04), transparent)",
      }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 380, animation: "fadeIn 0.6s ease-out" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>SEYN</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6, color: "var(--accent-light)" }}>Seynario</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {isRegister ? "Create your account" : "Welcome back"}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isRegister && (
            <input
              value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              style={{
                padding: "12px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font-body)",
              }}
            />
          )}
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" type="email"
            style={{
              padding: "12px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)",
              color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font-body)",
            }}
          />
          <input
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" type="password"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{
              padding: "12px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)",
              color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font-body)",
            }}
          />

          {error && <p style={{ fontSize: 13, color: "#e24b4a", margin: 0 }}>{error}</p>}

          <button onClick={handleSubmit} disabled={loading} style={{
            padding: "13px 0", borderRadius: 12, border: "none",
            background: "var(--accent)", color: "#fff",
            fontSize: 15, fontWeight: 600, marginTop: 4,
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "..." : isRegister ? "Create account" : "Log in"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <span onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{ color: "var(--accent-light)", cursor: "pointer" }}>
            {isRegister ? "Log in" : "Sign up"}
          </span>
        </p>
      </div>
    </div>
  );
}
