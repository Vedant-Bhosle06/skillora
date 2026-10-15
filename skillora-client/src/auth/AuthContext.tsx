import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/api/auth";
import { ApiError, setUnauthorizedHandler } from "@/api/client";
import { qk } from "@/api/queries";
import type { Me } from "@/api/types";
import { getMe } from "@/api/users";
import { TOKEN_KEY, tokenStore } from "@/auth/tokenStore";
import { useToast } from "@/context/ToastContext";

export type AuthStatus = "anonymous" | "loading" | "authenticated" | "error";

interface AuthContextValue {
  status: AuthStatus;
  user: Me | null;
  isAdmin: boolean;
  error: ApiError | null;
  login: (email: string, password: string) => Promise<Me>;
  register: (name: string, email: string, password: string) => Promise<Me>;
  logout: () => Promise<void>;
  clearSession: (reason?: "expired") => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The only component allowed to call the auth endpoints and getMe outside the
// query hooks. Auth calls run only from user actions (see golden rule 10).
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [token, setToken] = useState<string | null>(() => tokenStore.get());

  const meQuery = useQuery({ queryKey: qk.me, queryFn: getMe, enabled: !!token });

  const clearSession = useCallback((reason?: "expired") => {
    const hadToken = tokenStore.get() !== null;
    tokenStore.clear();
    setToken(null);
    queryClient.clear();
    if (reason === "expired" && hadToken) {
      showToast("Your session expired — please sign in again.", "warning");
    }
  }, [queryClient, showToast]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    queryClient.clear();
    tokenStore.set(res.token);
    setToken(res.token);
    return queryClient.fetchQuery({ queryKey: qk.me, queryFn: getMe });
  }, [queryClient]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await authApi.register(name, email, password);
    return login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // the session is cleared locally either way
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession("expired"));

    // Another tab logged out or signed in as someone else.
    function onStorage(e: StorageEvent) {
      if (e.key !== null && e.key !== TOKEN_KEY) return;
      const previous = tokenStore.get();
      const next = tokenStore.syncFromStorage();
      if (next !== previous) {
        setToken(next);
        queryClient.clear();
      }
    }
    window.addEventListener("storage", onStorage);

    return () => {
      setUnauthorizedHandler(null);
      window.removeEventListener("storage", onStorage);
    };
  }, [clearSession, queryClient]);

  const { refetch } = meQuery;
  const retry = useCallback(() => { void refetch(); }, [refetch]);

  let status: AuthStatus;
  if (!token) status = "anonymous";
  else if (meQuery.isPending) status = "loading";
  else if (meQuery.isSuccess) status = "authenticated";
  else status = "error";

  const user = status === "authenticated" ? meQuery.data ?? null : null;
  const error = status === "error" && meQuery.error instanceof ApiError ? meQuery.error : null;

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    isAdmin: user?.role === "admin",
    error,
    login,
    register,
    logout,
    clearSession,
    retry,
  }), [status, user, error, login, register, logout, clearSession, retry]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For pages behind RequireAuth, where the user is always loaded. */
export function useCurrentUser(): Me {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser called without a signed-in user");
  return user;
}
