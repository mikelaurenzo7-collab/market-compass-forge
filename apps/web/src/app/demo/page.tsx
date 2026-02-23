"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { motion } from "framer-motion";
import { Sparkles, Check, Circle, Download } from "lucide-react";

export default function DemoPage() {
  const { api, user } = useAuth();
  const [demoId, setDemoId] = useState<string | null>(null);

  const runDemo = useMutation({
    mutationFn: () => api.runDemo(),
    onSuccess: (data) => setDemoId(data.demo_id),
  });

  const { data: demo } = useQuery({
    queryKey: ["demo", demoId],
    queryFn: () => api.getDemoStatus(demoId!),
    enabled: !!user && !!demoId,
    refetchInterval: (d) => (d?.status === "pending" || d?.status === "running" ? 1500 : false),
  });

  const report = demo?.report;
  const isComplete = demo?.status === "completed";

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nvidia-demo-report-${demoId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const checklist = [
    { label: "Run 100k simulation", done: (demo?.percent_complete ?? 0) >= 40 },
    { label: "View IRR quantiles", done: isComplete },
    { label: "View timeline bands", done: isComplete },
    { label: "Contagion baseline + mitigation", done: (demo?.percent_complete ?? 0) >= 85 },
    { label: "Export PDF (from Simulation Lab)", done: isComplete },
    { label: "View benchmarks", done: isComplete },
  ];

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary">Sign in</Link>
      </Layout>
    );
  }

  const simData = report?.simulation?.irr_quantiles
    ? Object.entries(report.simulation.irr_quantiles).map(([p, v]) => ({ quantile: p, irr: Number(((v as number) * 100).toFixed(1)) }))
    : [];
  const timelineData = report?.simulation?.timeseries_percentiles?.portfolio_value ?? [];

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-foreground mb-2">NVIDIA Demo</h1>
      <p className="text-muted-foreground mb-10">Full GPU-ready workflow: simulation, contagion, deal scoring</p>

      {!demoId ? (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 text-center"
          >
            <Sparkles className="w-16 h-16 text-primary mx-auto mb-6 opacity-80" />
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Run the full NVIDIA proof workflow: 100k simulation, contagion baseline + mitigation, deal scoring.
            </p>
            <button
              onClick={() => runDemo.mutate()}
              disabled={runDemo.isPending}
              className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-5 h-5" />
              {runDemo.isPending ? "Starting…" : "Run NVIDIA Demo"}
            </button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <h2 className="font-semibold text-foreground mb-4">Demo Mode Checklist</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  <Circle className="w-4 h-4 opacity-50" />
                  {c.label}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-4">Use seeded portfolio (Growth Fund I) for smooth demo path.</p>
          </motion.div>
        </div>
      ) : (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <h2 className="font-semibold text-foreground mb-4">Progress</h2>
            <ul className="space-y-3 text-sm mb-6">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.done ? <Check className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 opacity-50" />}
                  <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                </li>
              ))}
            </ul>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${demo?.percent_complete ?? 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">{demo?.milestone ?? "—"} ({demo?.percent_complete ?? 0}%)</p>
          </motion.div>

          {isComplete && report && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Trials/sec", value: report.simulation?.trials_per_sec ?? "—" },
                  { label: "VaR 95%", value: ((report.simulation?.var_95 ?? 0) * 100).toFixed(1) + "%" },
                  { label: "Contagion Δ", value: report.contagion_delta?.total_risk_delta?.toFixed(2) ?? "—" },
                  { label: "Runtime (ms)", value: report.simulation?.runtime_ms ?? "—" },
                ].map((m) => (
                  <div key={m.label} className="glass-card p-5">
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold text-primary">{m.value}</p>
                  </div>
                ))}
              </div>

              {simData.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="font-semibold text-foreground mb-4">IRR Quantiles</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simData} layout="vertical" margin={{ left: 40 }}>
                        <XAxis type="number" tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="quantile" width={40} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                        <Bar dataKey="irr" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {timelineData.length > 0 && (
                <div className="glass-card p-6">
                  <h2 className="font-semibold text-foreground mb-4">Portfolio Value Timeline (p5, p50, p95)</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                        <Legend />
                        <Line type="monotone" dataKey="p5" stroke="#94a3b8" name="p5" />
                        <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" name="p50" />
                        <Line type="monotone" dataKey="p95" stroke="#1e293b" name="p95" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="glass-card p-6">
                <h2 className="font-semibold text-foreground mb-4">Contagion: Before vs After Mitigation</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Baseline</p>
                    <p className="text-xl font-bold text-primary">{report.contagion_baseline?.total_risk?.toFixed(2) ?? "—"}</p>
                    <ul className="text-sm mt-2 space-y-1 text-muted-foreground">
                      {(report.contagion_baseline?.top_impacted ?? []).slice(0, 5).map((x: any) => (
                        <li key={x.node_id}>{x.node_id}: {x.risk?.toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Mitigated</p>
                    <p className="text-xl font-bold text-primary">{report.contagion_mitigated?.total_risk?.toFixed(2) ?? "—"}</p>
                    <p className="text-sm text-primary mt-2">Δ Improvement: {report.contagion_delta?.total_risk_delta?.toFixed(2) ?? "—"}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card hover:border-primary/30 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Demo Report JSON
              </button>
            </>
          )}
        </div>
      )}
    </Layout>
  );
}
