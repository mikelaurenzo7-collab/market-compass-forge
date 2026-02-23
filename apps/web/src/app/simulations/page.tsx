"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { FlaskConical, Play } from "lucide-react";

function SimulationsContent() {
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
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.status === "pending" || d?.status === "running" ? 2000 : false;
    },
  });

  const [form, setForm] = useState({
    portfolio_id: portfolioId || "",
    scenario_template_id: "",
    n_trials: 10000,
  });
  const [running, setRunning] = useState(false);

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in to continue
        </Link>
      </Layout>
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
      window.location.href = `/simulations/${res.simulation_id}`;
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
      <h1 className="text-3xl font-bold text-foreground mb-2">Simulation Lab</h1>
      <p className="text-muted-foreground mb-10">Monte Carlo stress testing for portfolio scenarios</p>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Run Simulation
          </h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Portfolio</label>
              <select
                value={form.portfolio_id}
                onChange={(e) => setForm((f) => ({ ...f, portfolio_id: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select portfolio</option>
                {portfolios?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Scenario</label>
              <select
                value={form.scenario_template_id}
                onChange={(e) => setForm((f) => ({ ...f, scenario_template_id: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select scenario</option>
                {templates?.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Trials</label>
              <input
                type="number"
                value={form.n_trials}
                onChange={(e) => setForm((f) => ({ ...f, n_trials: parseInt(e.target.value) || 10000 }))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={runSimulation}
              disabled={running || !form.portfolio_id || !form.scenario_template_id}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {running ? "Starting..." : "Run Simulation"}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">How it works</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Select a portfolio and scenario template, then run. Monte Carlo simulations use correlated shocks,
            regime switching, and fat tails. Results appear when complete—view IRR/MOIC quantiles,
            VaR/CVaR, and timeline bands.
          </p>
        </motion.div>
      </div>

      {selectedSimId && simDetail && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">
            Simulation {simDetail.id?.slice(0, 8)}... — {simDetail.status}
          </h2>
          {simDetail.status === "pending" || simDetail.status === "running" ? (
            <div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: [`${simDetail.percent_complete ?? 0}%`, `${(simDetail.percent_complete ?? 0) + 5}%`] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              </div>
              <p className="text-muted-foreground text-sm">Running Monte Carlo simulation...</p>
            </div>
          ) : simDetail.status === "failed" ? (
            <p className="text-destructive">{simDetail.error_message}</p>
          ) : results ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Mean IRR", value: ((results.mean_irr ?? 0) * 100).toFixed(1) },
                  { label: "VaR 95%", value: ((results.var_95 ?? 0) * 100).toFixed(1) },
                  { label: "CVaR 95%", value: ((results.cvar_95 ?? 0) * 100).toFixed(1) },
                  { label: "Downside", value: ((results.downside_prob_below_threshold ?? 0) * 100).toFixed(1) },
                ].map((m) => (
                  <div key={m.label} className="glass-card p-4">
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold text-primary">{m.value}%</p>
                  </div>
                ))}
              </div>
              {irrData.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={irrData} layout="vertical" margin={{ left: 40 }}>
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="quantile" width={40} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                      <Bar dataKey="irr" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Link
                href={`/simulations/${selectedSimId}`}
                className="inline-block text-primary font-medium hover:underline"
              >
                View full results →
              </Link>
            </div>
          ) : null}
        </motion.div>
      )}
    </Layout>
  );
}

export default function SimulationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <SimulationsContent />
    </Suspense>
  );
}
