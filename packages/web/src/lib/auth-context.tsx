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
    onboardingRequired: boolean;
  }) => {
    localStorage.setItem('bb_auth', JSON.stringify({
      user: data.user,
      tenantId: data.tenantId,
      accessToken: data.accessToken,
      onboardingRequired: data.onboardingRequired,
    }));
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
        credentials: 'include',
        body: JSON.stringify({ email, password, displayName }),
      });
      const json = await res.json();
      if (!json.success) return { success: false, error: json.error };
      persistAuth({
        user: json.data.user,
        tenantId: json.data.tenantId,
        accessToken: json.data.accessToken,
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
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) return { success: false, error: json.error };
      persistAuth({
        user: json.data.user,
        tenantId: json.data.tenantId,
        accessToken: json.data.accessToken,
        onboardingRequired: json.data.onboardingRequired,
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [persistAuth]);

  const logout = useCallback(() => {
    // Fire logout request to clear HttpOnly cookie
    fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {},
    }).catch(() => {});
    localStorage.removeItem('bb_auth');
    setState({ user: null, tenantId: null, accessToken: null, loading: false, onboardingRequired: false });
  }, [state.accessToken]);

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

      // Attempt refresh once — cookie sent automatically
      try {
        const r = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        const jr = await r.json();
        if (jr?.success && jr.data?.accessToken) {
          const stored = localStorage.getItem('bb_auth');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.accessToken = jr.data.accessToken;
              localStorage.setItem('bb_auth', JSON.stringify(parsed));
            } catch {}
          }
          setState((s) => ({ ...s, accessToken: jr.data.accessToken }));

          const retry = await makeRequest(jr.data.accessToken);
          return retry;
        }
      } catch {
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
