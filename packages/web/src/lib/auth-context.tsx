'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: User | null;
  tenantId: string | null;
  accessToken: string | null;
  loading: boolean;
  onboardingRequired: boolean;
}

interface AuthContextType extends AuthState {
  signup: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  completeOnboarding: () => void;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenantId: null,
    accessToken: null,
    loading: true,
    onboardingRequired: false,
  });

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('bb_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({
          user: parsed.user,
          tenantId: parsed.tenantId,
          accessToken: parsed.accessToken,
          loading: false,
          onboardingRequired: parsed.onboardingRequired ?? false,
        });
      } catch {
        localStorage.removeItem('bb_auth');
        setState((s) => ({ ...s, loading: false }));
      }
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const persistAuth = useCallback((data: {
    user: User;
    tenantId: string;
    accessToken: string;
    refreshToken?: string;
    onboardingRequired: boolean;
  }) => {
    localStorage.setItem('bb_auth', JSON.stringify(data));
    if (data.refreshToken) {
      localStorage.setItem('bb_refresh', data.refreshToken);
    }
    setState({
      user: data.user,
      tenantId: data.tenantId,
      accessToken: data.accessToken,
      loading: false,
      onboardingRequired: data.onboardingRequired,
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    const stored = localStorage.getItem('bb_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.onboardingRequired = false;
      localStorage.setItem('bb_auth', JSON.stringify(parsed));
    }
    setState((s) => ({ ...s, onboardingRequired: false }));
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      const json = await res.json();
      if (!json.success) return { success: false, error: json.error };
      persistAuth({
        user: json.data.user,
        tenantId: json.data.tenantId,
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
        onboardingRequired: json.data.onboardingRequired,
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [persistAuth]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) return { success: false, error: json.error };
      persistAuth({
        user: json.data.user,
        tenantId: json.data.tenantId,
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
        onboardingRequired: json.data.onboardingRequired,
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [persistAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('bb_auth');
    localStorage.removeItem('bb_refresh');
    setState({ user: null, tenantId: null, accessToken: null, loading: false, onboardingRequired: false });
  }, []);

  const apiFetch = useCallback(async (path: string, init?: RequestInit): Promise<Response> => {
    const makeRequest = async (token?: string) => {
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else if (state.accessToken) {
        headers.set('Authorization', `Bearer ${state.accessToken}`);
      }
      if (!headers.has('Content-Type') && init?.body) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(`${API_URL}${path}`, { ...init, headers });
    };

    try {
      const res = await makeRequest();
      if (res.status !== 401) return res;

      // Attempt refresh once
      const refreshToken = localStorage.getItem('bb_refresh');
      if (!refreshToken) return res;

      try {
        const r = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const jr = await r.json();
        if (jr?.success && jr.data?.accessToken) {
          // update storage and state
          const stored = localStorage.getItem('bb_auth');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.accessToken = jr.data.accessToken;
              parsed.onboardingRequired = parsed.onboardingRequired ?? false;
              localStorage.setItem('bb_auth', JSON.stringify(parsed));
            } catch {}
          }
          if (jr.data.refreshToken) localStorage.setItem('bb_refresh', jr.data.refreshToken);
          setState((s) => ({ ...s, accessToken: jr.data.accessToken }));

          // retry original request with new token
          const retry = await makeRequest(jr.data.accessToken);
          return retry;
        }
      } catch (e) {
        // refresh failed — fall through to return original 401 response
        return res;
      }

      return res;
    } catch (err) {
      throw err;
    }
  }, [state.accessToken]);

  return (
    <AuthContext.Provider value={{ ...state, signup, login, logout, completeOnboarding, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}
