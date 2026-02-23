"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";

export default function BenchmarksPage() {
  const { api, user } = useAuth();

  const { data: benchmarks, refetch } = useQuery({
    queryKey: ["benchmarks"],
    queryFn: () => api.getBenchmarks(),
    enabled: !!user,
  });

  const runBenchmark = useMutation({
    mutationFn: () => api.runBenchmarks(),
    onSuccess: () => {
      setTimeout(() => refetch(), 5000);
    },
  });

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  const hw = benchmarks?.hardware ?? {};
  const sim = benchmarks?.simulation ?? benchmarks?.benchmarks ?? {};
  const graph = benchmarks?.graph ?? benchmarks?.contagion ?? {};
  const dealScoring = benchmarks?.deal_scoring ?? {};

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Benchmarks</h1>

      <div className="flex gap-4 items-center mb-6">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          Compute: {hw.compute_backend ?? "—"}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          Torch: {hw.torch_device ?? "—"}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          GPU: {hw.gpu_present ? "Yes" : "No"}
        </span>
        <button
          onClick={() => runBenchmark.mutate()}
          disabled={runBenchmark.isPending}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {runBenchmark.isPending ? "Running…" : "Run Benchmarks"}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Hardware</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-600">CPU</dt>
            <dd>{hw.cpu_model ?? "—"}</dd>
            <dt className="text-slate-600">RAM (GB)</dt>
            <dd>{hw.ram_gb ?? "—"}</dd>
            <dt className="text-slate-600">CUDA Device</dt>
            <dd>{hw.cuda_device_name ?? "—"}</dd>
          </dl>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Simulation</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Trials</th>
                  <th className="text-left py-2">Elapsed (s)</th>
                  <th className="text-left py-2">Trials/sec</th>
                  <th className="text-left py-2">Backend</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(sim).map(([k, v]: [string, any]) => (
                  <tr key={k} className="border-b">
                    <td className="py-2">{v?.n_trials ? `${v.n_companies ?? "—"} cos, ${v.n_trials} trials` : k}</td>
                    <td className="py-2">{v?.runtime_ms ?? v?.elapsed_sec ?? "—"}</td>
                    <td className="py-2 font-mono">{v?.trials_per_sec ?? "—"}</td>
                    <td className="py-2">{v?.backend ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!Object.keys(sim).length && <p className="text-slate-600">{benchmarks?.message ?? "No benchmark data."}</p>}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Graph / Contagion</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Size</th>
                  <th className="text-left py-2">Nodes / Edges</th>
                  <th className="text-left py-2">Runtime (ms)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(graph).map(([k, v]: [string, any]) => (
                  <tr key={k} className="border-b">
                    <td className="py-2">{v?.label ?? k}</td>
                    <td className="py-2">{v?.n_nodes ? `${v.n_nodes} / ${v.n_edges}` : v?.nodes ?? "—"}</td>
                    <td className="py-2">{v?.runtime_ms ?? v?.elapsed_sec ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Deal Scoring Inference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Requests</th>
                  <th className="text-left py-2">Elapsed (s)</th>
                  <th className="text-left py-2">Req/sec</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dealScoring).map(([k, v]: [string, any]) => (
                  <tr key={k} className="border-b">
                    <td className="py-2">{v?.n_inferences ?? v?.n_requests ?? k}</td>
                    <td className="py-2">{v?.runtime_ms ?? v?.elapsed_sec ?? "—"}</td>
                    <td className="py-2 font-mono">{v?.inferences_per_sec ?? v?.requests_per_sec ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
