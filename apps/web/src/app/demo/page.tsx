"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

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

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  const simData = report?.simulation?.irr_quantiles
    ? Object.entries(report.simulation.irr_quantiles).map(([p, v]) => ({ quantile: p, irr: Number(((v as number) * 100).toFixed(1)) }))
    : [];

  const timelineData = report?.simulation?.timeseries_percentiles?.portfolio_value ?? [];

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">NVIDIA Demo</h1>

      <div className="flex gap-4 items-center mb-6">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          Compute: {report?.hardware?.compute_backend ?? demo?.report?.hardware?.compute_backend ?? "—"}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          Torch: {report?.hardware?.torch_device ?? demo?.report?.hardware?.torch_device ?? "—"}
        </span>
      </div>

      {!demoId ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-slate-600 mb-6">Run the full NVIDIA proof workflow: 100k simulation, contagion baseline + mitigation, deal scoring.</p>
            <button
              onClick={() => runDemo.mutate()}
              disabled={runDemo.isPending}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {runDemo.isPending ? "Starting…" : "Run NVIDIA Demo"}
            </button>
          </div>
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-medium mb-4">Demo Mode Checklist</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>☐ Run 100k simulation (correlated + regime switching)</li>
              <li>☐ View IRR quantiles chart</li>
              <li>☐ View timeline bands (portfolio value p5/p50/p95)</li>
              <li>☐ Run contagion baseline + mitigation</li>
              <li>☐ Export PDF report</li>
              <li>☐ View benchmarks at /benchmarks</li>
            </ul>
            <p className="text-xs text-slate-500 mt-4">Use seeded portfolio (Growth Fund I) for smooth demo path.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-medium mb-4">Demo Mode Checklist</h2>
            <ul className="space-y-2 text-sm text-slate-600 mb-6">
              <li>{demo?.percent_complete >= 40 ? "✓" : "☐"} Run 100k simulation</li>
              <li>{isComplete ? "✓" : "☐"} View IRR quantiles</li>
              <li>{isComplete ? "✓" : "☐"} View timeline bands</li>
              <li>{demo?.percent_complete >= 85 ? "✓" : "☐"} Contagion baseline + mitigation</li>
              <li>{isComplete ? "✓" : "☐"} Export PDF (from Simulation Lab)</li>
              <li>{isComplete ? "✓" : "☐"} View benchmarks</li>
            </ul>
            <h2 className="font-medium mb-4">Progress</h2>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-700 transition-all"
                style={{ width: `${demo?.percent_complete ?? 0}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 mt-2">
              {demo?.milestone ?? "—"} ({demo?.percent_complete ?? 0}%)
            </p>
          </div>

          {isComplete && report && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">Trials/sec</p>
                  <p className="text-xl font-semibold">{report.simulation?.trials_per_sec ?? "—"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">VaR 95%</p>
                  <p className="text-xl font-semibold">{((report.simulation?.var_95 ?? 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">Contagion Delta</p>
                  <p className="text-xl font-semibold">{report.contagion_delta?.total_risk_delta?.toFixed(2) ?? "—"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">Runtime (ms)</p>
                  <p className="text-xl font-semibold">{report.simulation?.runtime_ms ?? "—"}</p>
                </div>
              </div>

              {simData.length > 0 && (
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="font-medium mb-4">IRR Quantiles</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simData} layout="vertical" margin={{ left: 40 }}>
                        <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="quantile" width={40} />
                        <Tooltip />
                        <Bar dataKey="irr" fill="#64748b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {timelineData.length > 0 && (
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="font-medium mb-4">Portfolio Value Timeline (p5, p50, p95)</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="p5" stroke="#94a3b8" name="p5" />
                        <Line type="monotone" dataKey="p50" stroke="#475569" name="p50" />
                        <Line type="monotone" dataKey="p95" stroke="#1e293b" name="p95" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-medium mb-4">Contagion: Before vs After Mitigation</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Baseline</p>
                    <p className="text-lg font-semibold">Total Risk: {report.contagion_baseline?.total_risk?.toFixed(2) ?? "—"}</p>
                    <ul className="text-sm mt-2 space-y-1">
                      {(report.contagion_baseline?.top_impacted ?? []).slice(0, 5).map((x: any) => (
                        <li key={x.node_id}>{x.node_id}: {x.risk?.toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Mitigated</p>
                    <p className="text-lg font-semibold">Total Risk: {report.contagion_mitigated?.total_risk?.toFixed(2) ?? "—"}</p>
                    <p className="text-sm text-green-600 mt-2">Δ Improvement: {report.contagion_delta?.total_risk_delta?.toFixed(2) ?? "—"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-medium mb-4">Deal Scores</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Deal</th>
                        <th className="text-left py-2">Exit Prob</th>
                        <th className="text-left py-2">Risk Bucket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.deal_scores ?? []).map((d: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="py-2">{i + 1}</td>
                          <td className="py-2">{((d.exit_probability ?? 0) * 100).toFixed(1)}%</td>
                          <td className="py-2">{d.risk_bucket ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={handleDownloadReport}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
              >
                Download Demo Report JSON
              </button>
            </>
          )}
        </div>
      )}
    </Layout>
  );
}
