import { createContext, useContext, useState, useCallback } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState({ access: null, refresh: null });

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
