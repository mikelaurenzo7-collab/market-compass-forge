"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";

export default function PortfoliosPage() {
  const { api, user } = useAuth();
  const { data: portfolios, isLoading, error } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => api.listPortfolios(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link href="/login" className="text-slate-900 font-medium">
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Portfolios</h1>
        <Link
          href="/portfolios/new"
          className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 text-sm font-medium"
        >
          New Portfolio
        </Link>
      </div>
      {isLoading && <p className="text-slate-600">Loading...</p>}
      {error && <p className="text-red-600">Error loading portfolios</p>}
      {portfolios && portfolios.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-600 mb-4">No portfolios yet</p>
          <Link
            href="/portfolios/new"
            className="text-slate-900 font-medium hover:underline"
          >
            Create your first portfolio
          </Link>
        </div>
      )}
      {portfolios && portfolios.length > 0 && (
        <div className="grid gap-4">
          {portfolios.map((p: any) => (
            <Link
              key={p.id}
              href={`/portfolios/${p.id}`}
              className="block bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 transition"
            >
              <h2 className="font-medium text-slate-900">{p.name}</h2>
              <p className="text-sm text-slate-600 mt-1">
                {p.position_count} positions · ${(p.total_value || 0).toLocaleString()} total value
              </p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
