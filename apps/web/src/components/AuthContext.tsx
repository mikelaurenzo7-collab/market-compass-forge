"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ApiClient, LoginResponse } from "@grapevine/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "grapevine_token";
const ORG_KEY = "grapevine_org";

const apiClient = new ApiClient(
  API_URL,
  () => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null),
  () => (typeof window !== "undefined" ? localStorage.getItem(ORG_KEY) : null)
);

interface AuthContextType {
  user: LoginResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, orgName?: string) => Promise<void>;
  logout: () => void;
  setOrgId: (orgId: string) => void;
  api: ApiClient;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const orgs = JSON.parse(localStorage.getItem("grapevine_orgs") || "[]");
      setUser({
        access_token: token,
        token_type: "bearer",
        user_id: "",
        email: localStorage.getItem("grapevine_email") || "",
        orgs,
      });
      if (orgs[0] && !localStorage.getItem(ORG_KEY)) {
        localStorage.setItem(ORG_KEY, orgs[0].id);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.login(email, password);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem("grapevine_email", res.email);
    localStorage.setItem("grapevine_orgs", JSON.stringify(res.orgs));
    if (res.orgs[0]) localStorage.setItem(ORG_KEY, res.orgs[0].id);
    setUser(res);
  };

  const register = async (
    email: string,
    password: string,
    fullName?: string,
    orgName?: string
  ) => {
    const res = await apiClient.register(email, password, fullName, orgName);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem("grapevine_email", res.email);
    localStorage.setItem("grapevine_orgs", JSON.stringify(res.orgs));
    if (res.orgs[0]) localStorage.setItem(ORG_KEY, res.orgs[0].id);
    setUser(res);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ORG_KEY);
    localStorage.removeItem("grapevine_email");
    localStorage.removeItem("grapevine_orgs");
    setUser(null);
  };

  const setOrgId = (orgId: string) => {
    localStorage.setItem(ORG_KEY, orgId);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, setOrgId, api: apiClient }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
