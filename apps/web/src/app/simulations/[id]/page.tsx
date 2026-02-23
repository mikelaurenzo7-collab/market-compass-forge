"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function SimulationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { api, user } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: sim } = useQuery({
    queryKey: ["simulation", id],
    queryFn: () => api.getSimulation(id),
    enabled: !!user && !!id,
    refetchInterval: (d) => (d?.status === "pending" || d?.status === "running" ? 2000 : false),
  });

  const exportMutation = useMutation({
    mutationFn: async (type: "pdf" | "csv") => {
      const res = await api.createExport(id, type);
      await api.downloadExport(res.export_id, `simulation_report.${type}`);
    },
    onMutate: (type) => setExporting(type),
    onSettled: () => setExporting(null),
  });

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  const results = sim?.results;
  const irrData = results?.irr_quantiles
    ? Object.entries(results.irr_quantiles).map(([p, v]) => ({ quantile: p, irr: (v as number) * 100 }))
    : [];

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <Link href="/simulations" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
        {sim?.status === "completed" && (
          <div className="flex gap-2">
            <button
              onClick={() => exportMutation.mutate("pdf")}
              disabled={exportMutation.isPending}
              className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
            >
              {exporting === "pdf" ? "Generating..." : "Export PDF"}
            </button>
            <button
              onClick={() => exportMutation.mutate("csv")}
              disabled={exportMutation.isPending}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-800 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              {exporting === "csv" ? "Generating..." : "Export CSV"}
            </button>
          </div>
        )}
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">
        Simulation {id?.slice(0, 8)}...
      </h1>

      <div className="mb-6 p-4 bg-white rounded-lg border">
        <p className="font-medium">Status: {sim?.status}</p>
        {(sim?.status === "running" || sim?.status === "pending") && (
          <p className="text-sm text-slate-600 mt-2">
            Progress: {sim?.processed_trials ?? 0} / {sim?.total_trials ?? sim?.n_trials ?? 0} trials
            ({sim?.percent_complete ?? 0}%)
          </p>
        )}
      </div>

      {sim?.status === "failed" && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-medium text-red-800">Simulation failed</p>
          <p className="text-sm text-red-600 mt-1">{sim?.error_message ?? "Unknown error"}</p>
          <Link href="/simulations" className="text-sm text-red-700 hover:underline mt-2 inline-block">← Back to Simulation Lab</Link>
        </div>
      )}
      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded">
              <p className="text-sm text-slate-600">Mean IRR</p>
              <p className="text-xl font-semibold">{((results.mean_irr ?? 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded">
              <p className="text-sm text-slate-600">VaR 95%</p>
              <p className="text-xl font-semibold">{((results.var_95 ?? 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded">
              <p className="text-sm text-slate-600">CVaR 95%</p>
              <p className="text-xl font-semibold">{((results.cvar_95 ?? 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded">
              <p className="text-sm text-slate-600">Downside (&lt;10%)</p>
              <p className="text-xl font-semibold">{((results.downside_prob_below_threshold ?? 0) * 100).toFixed(1)}%</p>
            </div>
          </div>
          {irrData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={irrData} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="quantile" width={40} />
                  <Tooltip formatter={(v: number) => [`${v?.toFixed(1)}%`, "IRR"]} />
                  <Bar dataKey="irr" fill="#64748b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
