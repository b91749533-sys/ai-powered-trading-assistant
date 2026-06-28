import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { api, getAuthToken, setAuthToken, clearAuthToken } from "@/services/api";

export interface UserProfile {
  id: number;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchCurrentUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profile = await api.get<UserProfile>("/auth/me");
      setUser(profile);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load user profile", err);
      setUser(null);
      clearAuthToken();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.loginForm(email, password);
      setAuthToken(res.access_token);
      await fetchCurrentUser();
      return true;
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await api.post("/auth/register", { email, password });
      // auto-login after register
      return await login(email, password);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Route guarding: redirect to login if not authenticated
  const requireAuth = useCallback(() => {
    if (!loading && !user && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [loading, user, router]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    requireAuth,
    fetchCurrentUser
  };
}
