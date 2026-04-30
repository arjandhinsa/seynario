import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { SketchbookPage, Masthead } from "./sketchbook";

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
    <SketchbookPage>
      <Masthead title="SEYNARIO" eyebrow="Vol. 01" right={null} />

      <main className="sb-login">
        <header className="sb-login__head">
          <div className="sb-eyebrow">A WORKING METHOD</div>
          <h1 className="sb-display sb-display-xl sb-login__title">
            Wear the occasion, with Seynario
          </h1>
        </header>

        <hr className="sb-login__rule" />

        <p className="sb-login__lede">
          Photograph what you own. Tell us the occasion. We compose the look + explain it.
        </p>

        <div className="sb-login__form">
          {isRegister && (
            <div className="sb-login__field">
              <label className="sb-login__label" htmlFor="login-display-name">Display name</label>
              <input
                id="login-display-name"
                className="sb-login__input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="sb-login__field">
            <label className="sb-login__label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="sb-login__input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="sb-login__field">
            <label className="sb-login__label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="sb-login__input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </div>

          {error && <p className="sb-login__error">{error}</p>}

          <button
            type="button"
            className="sb-login__submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "…" : isRegister ? "Sign up →" : "Sign in →"}
          </button>
        </div>

        <div className="sb-login__divider">or</div>

        <Link to="/demo" className="sb-login__demo">
          Try with our sample wardrobe →
        </Link>
        <p className="sb-login__demo-sub">
          18 sample garments, no upload required.
        </p>

        <p className="sb-login__toggle">
          {isRegister ? "Already have an account?" : "Don't have an account?"}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
          >
            {isRegister ? "Sign in →" : "Sign up →"}
          </button>
        </p>
      </main>
    </SketchbookPage>
  );
}
