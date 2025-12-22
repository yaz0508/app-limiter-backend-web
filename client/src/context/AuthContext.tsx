import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProfile, loginRequest } from "../lib/api";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem("auth_token")
  );
  const [loading, setLoading] = useState<boolean>(!!token);

  useEffect(() => {
    const hydrate = async () => {
      if (!token) return;
      try {
        const me = await getProfile(token);
        setUser(me.user);
      } catch (err) {
        console.error(err);
        setToken(null);
        sessionStorage.removeItem("auth_token");
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const resp = await loginRequest(email, password);
      setToken(resp.token);
      setUser(resp.user);
      sessionStorage.setItem("auth_token", resp.token);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("auth_token");
  };

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};


