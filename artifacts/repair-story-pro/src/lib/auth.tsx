import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserResponse, getMe, getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  login: (token: string, userData: UserResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inject token into ALL native fetches (which Orval generated hooks use)
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem("repair_story_token");
  if (token) {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  }
  return originalFetch(input, init);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("repair_story_token");
      if (token) {
        try {
          const userData = await getMe();
          setUser(userData);
          queryClient.setQueryData(getGetMeQueryKey(), userData);
        } catch (error) {
          console.error("Failed to restore session:", error);
          localStorage.removeItem("repair_story_token");
          if (import.meta.env.DEV) {
            await devAutoLogin();
          }
        }
      } else if (import.meta.env.DEV) {
        await devAutoLogin();
      }
      setIsLoading(false);
    };

    const devAutoLogin = async () => {
      try {
        const res = await originalFetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "admin@example.com", password: "Passw0rd!" }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("repair_story_token", data.accessToken);
          setUser(data.user);
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
        }
      } catch (e) {
        console.error("Dev auto-login failed:", e);
      }
    };

    initAuth();
  }, [queryClient]);

  const login = (token: string, userData: UserResponse) => {
    localStorage.setItem("repair_story_token", token);
    setUser(userData);
    queryClient.setQueryData(getGetMeQueryKey(), userData);
  };

  const logout = () => {
    localStorage.removeItem("repair_story_token");
    setUser(null);
    queryClient.clear();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
