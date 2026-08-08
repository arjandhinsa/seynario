import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import { track } from "../services/analytics";

/**
 * One-tap auth buttons. Each provider renders only when its client id is
 * configured (VITE_GOOGLE_CLIENT_ID / VITE_APPLE_CLIENT_ID in frontend
 * .env), so an unconfigured provider simply doesn't appear — nothing
 * breaks while credentials are pending.
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID;

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      // Tag present but possibly still downloading (React StrictMode
      // mounts twice in dev) — wait for its load event, don't assume.
      if (existing.dataset.loaded) return resolve();
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.id = id;
    s.async = true;
    s.onload = () => { s.dataset.loaded = "1"; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function SocialButtons({ onSuccess, onError }) {
  const { socialLogin } = useAuth();
  const googleDiv = useRef(null);
  const [appleReady, setAppleReady] = useState(false);

  // --- Google Identity Services ---
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadScript("https://accounts.google.com/gsi/client", "google-gsi").then(() => {
      if (cancelled || !window.google || !googleDiv.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            track("signup_started", { method: "google" });
            await socialLogin("google", response.credential);
            track("signup_completed", { method: "google" });
            onSuccess?.();
          } catch (e) {
            onError?.(e.message || "Google sign-in failed.");
          }
        },
      });
      window.google.accounts.id.renderButton(googleDiv.current, {
        theme: "outline", size: "large", width: 320, text: "continue_with",
      });
    }).catch(() => onError?.("Couldn't load Google sign-in."));
    return () => { cancelled = true; };
  }, []);

  // --- Sign in with Apple ---
  useEffect(() => {
    if (!APPLE_CLIENT_ID) return;
    loadScript(
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
      "apple-auth",
    ).then(() => {
      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: "name email",
        redirectURI: window.location.origin,
        usePopup: true,
      });
      setAppleReady(true);
    }).catch(() => onError?.("Couldn't load Apple sign-in."));
  }, []);

  const appleSignIn = async () => {
    try {
      track("signup_started", { method: "apple" });
      const res = await window.AppleID.auth.signIn();
      await socialLogin("apple", res.authorization.id_token);
      track("signup_completed", { method: "apple" });
      onSuccess?.();
    } catch (e) {
      if (e?.error === "popup_closed_by_user") return;
      onError?.(e.message || "Apple sign-in failed.");
    }
  };

  if (!GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, margin: "18px 0 6px" }}>
      {GOOGLE_CLIENT_ID && <div ref={googleDiv} />}
      {APPLE_CLIENT_ID && appleReady && (
        <button
          type="button"
          onClick={appleSignIn}
          style={{
            width: 320, padding: "12px 0",
            background: "#000", color: "#fff", border: 0, borderRadius: 4,
            fontFamily: "var(--sb-font-body)", fontSize: 15, cursor: "pointer",
          }}
        > Continue with Apple</button>
      )}
      <div className="sb-login__divider" style={{ width: "100%" }}>or use email</div>
    </div>
  );
}
