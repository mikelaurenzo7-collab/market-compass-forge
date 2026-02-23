"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const { login, register, user } = useAuth();
  const router = useRouter();

  if (user) {
    router.push("/portfolios");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      router.push("/portfolios");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            Grapevine Intelligence Engine
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Private markets intelligence for PE & family offices
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-800"
              required
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition"
          >
            {isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          {isRegister ? (
            <>Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-slate-900 font-medium hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>No account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-slate-900 font-medium hover:underline"
              >
                Register
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
