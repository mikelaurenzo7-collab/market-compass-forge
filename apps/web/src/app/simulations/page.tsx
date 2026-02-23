"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function SimulationsPage() {
  const searchParams = useSearchParams();
  const portfolioId = searchParams.get("portfolio");
  const { api, user } = useAuth();
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);

  const { data: portfolios } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => api.listPortfolios(),
    enabled: !!user,
  });

  const { data: templates } = useQuery({
    queryKey: ["scenario-templates"],
    queryFn: () => api.listScenarioTemplates(),
    enabled: !!user,
  });

  const { data: simDetail } = useQuery({
    queryKey: ["simulation", selectedSimId],
    queryFn: () => api.getSimulation(selectedSimId!),
    enabled: !!user && !!selectedSimId,
    refetchInterval: (data) =>
      data?.status === "pending" || data?.status === "running" ? 2000 : false,
  });


  const [form, setForm] = useState({
    portfolio_id: portfolioId || "",
    scenario_template_id: "",
    n_trials: 10000,
  });
  const [running, setRunning] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link href="/login" className="text-slate-900 font-medium">
          Sign in to continue
        </Link>
      </div>
    );
  }

  const runSimulation = async () => {
    if (!form.portfolio_id || !form.scenario_template_id) return;
    setRunning(true);
    try {
      const res = await api.createSimulation({
        portfolio_id: form.portfolio_id,
        scenario_template_id: form.scenario_template_id,
        n_trials: form.n_trials,
      });
      setSelectedSimId(res.simulation_id);
      if (typeof window !== "undefined") {
        window.location.href = `/simulations/${res.simulation_id}`;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const results = simDetail?.results;
  const irrData = results?.irr_quantiles
    ? Object.entries(results.irr_quantiles).map(([p, v]) => ({
        quantile: p,
        irr: typeof v === "number" ? v * 100 : 0,
      }))
    : [];

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Simulation Lab</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-medium text-slate-900 mb-4">Run Simulation</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio</label>
              <select
                value={form.portfolio_id}
                onChange={(e) => setForm((f) => ({ ...f, portfolio_id: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Select portfolio</option>
                {portfolios?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scenario</label>
              <select
                value={form.scenario_template_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scenario_template_id: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Select scenario</option>
                {templates?.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trials</label>
              <input
                type="number"
                value={form.n_trials}
                onChange={(e) =>
                  setForm((f) => ({ ...f, n_trials: parseInt(e.target.value) || 10000 }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <button
              onClick={runSimulation}
              disabled={running || !form.portfolio_id || !form.scenario_template_id}
              className="w-full py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
            >
              {running ? "Starting..." : "Run Simulation"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-medium text-slate-900 mb-4">Simulation</h2>
          <p className="text-sm text-slate-600">
            Select portfolio and scenario, then run. Results appear below when complete.
          </p>
        </div>
      </div>

      {selectedSimId && simDetail && (
        <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-medium text-slate-900 mb-4">
            Simulation {simDetail.id?.slice(0, 8)}... — {simDetail.status}
          </h2>
          {simDetail.status === "pending" || simDetail.status === "running" ? (
            <p className="text-slate-600">Running Monte Carlo simulation... This may take a minute.</p>
          ) : simDetail.status === "failed" ? (
            <p className="text-red-600">{simDetail.error_message}</p>
          ) : results ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">Mean IRR</p>
                  <p className="text-xl font-semibold">{((results.mean_irr ?? 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">VaR 95%</p>
                  <p className="text-xl font-semibold">{(results.var_95 * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">CVaR 95%</p>
                  <p className="text-xl font-semibold">{(results.cvar_95 * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">Downside (&lt;10% IRR)</p>
                  <p className="text-xl font-semibold">
                    {(results.downside_prob_below_threshold * 100).toFixed(1)}%
                  </p>
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
          ) : null}
        </div>
      )}
    </Layout>
  );
}
