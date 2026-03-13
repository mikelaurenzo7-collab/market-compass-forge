'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (!configured) return '';

  if (typeof window !== 'undefined') {
    const localhostApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured);
    const pageOnLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    // On forwarded hosts, avoid hard-coded localhost calls from the browser.
    if (localhostApi && !pageOnLocalhost) return '';
  }

  return configured;
}

const API_URL = resolveApiUrl();

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

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (private mode / restrictive browser settings).
  }
}

function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

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
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const request = fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
      .then((r) => r.json().catch(() => ({ success: false })))
      .then((jr) => (jr?.success && jr.data?.accessToken ? jr.data.accessToken as string : null))
      .catch(() => null)
      .finally(() => {
        refreshInFlightRef.current = null;
      });

    refreshInFlightRef.current = request;
    return request;
  }, []);

  // Restore session from localStorage (user info only — token is obtained via refresh cookie)
  useEffect(() => {
    let cancelled = false;
    const stored = localStorage.getItem('bb_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // User/tenant info stored in localStorage for fast hydration.
        // Access token is NOT stored — it stays in memory only (XSS-safe).
        // On page reload, the refresh cookie (HttpOnly) is used to get a new access token.
        setState({
          user: parsed.user,
          tenantId: parsed.tenantId,
          accessToken: null, // will be refreshed below
          loading: true,
          onboardingRequired: parsed.onboardingRequired ?? false,
        });

        const restore = async () => {
          const token = await refreshAccessToken();
          if (token) {
            if (!cancelled) {
              setState((s) => ({ ...s, accessToken: token, loading: false }));
            }
            return;
          }

          // Retry once to handle refresh-token rotation races on dev remounts.
          const retryToken = await refreshAccessToken();
          if (retryToken) {
            if (!cancelled) {
              setState((s) => ({ ...s, accessToken: retryToken, loading: false }));
            }
            return;
          }

          if (!cancelled) {
            setState((s) => ({ ...s, loading: false }));
          }
        };

        void restore();
      } catch {
        localStorage.removeItem('bb_session');
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false }));
        }
      }
    } else {
      if (!cancelled) {
        setState((s) => ({ ...s, loading: false }));
      }
    }
    return () => {
      cancelled = true;
    };
  }, [refreshAccessToken]);

  const persistAuth = useCallback((data: {
    user: User;
    tenantId: string;
    accessToken: string;
    onboardingRequired: boolean;
  }) => {
    localStorage.setItem('bb_session', JSON.stringify({
      user: data.user,
      tenantId: data.tenantId,
      onboardingRequired: data.onboardingRequired,
    }));
    setState({
      user: data.user,
      tenantId: data.tenantId,
      accessToken: data.accessToken, // kept in memory only
      loading: false,
      onboardingRequired: data.onboardingRequired,
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    const stored = localStorage.getItem('bb_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.onboardingRequired = false;
      localStorage.setItem('bb_session', JSON.stringify(parsed));
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
    localStorage.removeItem('bb_session');
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
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        // Store new access token in memory only — never in localStorage
        setState((s) => ({ ...s, accessToken: refreshedToken }));
        const retry = await makeRequest(refreshedToken);
        return retry;
      }

      return res;
    } catch (err) {
      throw err;
    }
  }, [state.accessToken, refreshAccessToken]);

  return (
    <AuthContext.Provider value={{ ...state, signup, login, logout, completeOnboarding, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}
