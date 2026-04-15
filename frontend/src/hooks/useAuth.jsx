import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState(() => {
    const saved = localStorage.getItem("seynario_tokens");
    return saved ? JSON.parse(saved) : { access: null, refresh: null };
  });

  useEffect(() => {
    if (tokens.access) {
      localStorage.setItem("seynario_tokens", JSON.stringify(tokens));
    } else {
      localStorage.removeItem("seynario_tokens");
    }
  }, [tokens]);

  // Auto-login on refresh if tokens exist
  useEffect(() => {
    const restore = async () => {
      if (tokens.access) {
        try {
          const userData = await api.get("/api/auth/me", tokens.access);
          setUser(userData);
        } catch (e) {
          // Token expired — try refresh
          if (tokens.refresh) {
            try {
              const data = await api.post("/api/auth/refresh", { refresh_token: tokens.refresh });
              setTokens({ access: data.access_token, refresh: data.refresh_token });
              const userData = await api.get("/api/auth/me", data.access_token);
              setUser(userData);
            } catch {
              setTokens({ access: null, refresh: null });
            }
          } else {
            setTokens({ access: null, refresh: null });
          }
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    setTokens({ access: data.access_token, refresh: data.refresh_token });
    const userData = await api.get("/api/auth/me", data.access_token);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const data = await api.post("/api/auth/register", { email, password, display_name: displayName });
    setTokens({ access: data.access_token, refresh: data.refresh_token });
    const userData = await api.get("/api/auth/me", data.access_token);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    setTokens({ access: null, refresh: null });
    setUser(null);
  }, []);

  const getToken = useCallback(() => tokens.access, [tokens]);

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}