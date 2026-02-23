"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gauge, Cpu, Zap } from "lucide-react";

export default function BenchmarksPage() {
  const { api, user } = useAuth();

  const { data: benchmarks, refetch } = useQuery({
    queryKey: ["benchmarks"],
    queryFn: () => api.getBenchmarks(),
    enabled: !!user,
  });

  const runBenchmark = useMutation({
    mutationFn: () => api.runBenchmarks(),
    onSuccess: () => setTimeout(() => refetch(), 5000),
  });

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary">Sign in</Link>
      </Layout>
    );
  }

  const hw = benchmarks?.hardware ?? {};
  const sim = benchmarks?.simulation ?? benchmarks?.benchmarks ?? {};
  const graph = benchmarks?.graph ?? benchmarks?.contagion ?? {};
  const dealScoring = benchmarks?.deal_scoring ?? {};

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-foreground mb-2">Benchmarks</h1>
      <p className="text-muted-foreground mb-10">GPU/CPU performance metrics</p>

      <div className="flex flex-wrap gap-4 items-center mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-sm font-medium">
          <Cpu className="w-4 h-4 text-primary" />
          Compute: {hw.compute_backend ?? "—"}
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-sm font-medium">
          Torch: {hw.torch_device ?? "—"}
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-sm font-medium">
          <Zap className="w-4 h-4 text-primary" />
          GPU: {hw.gpu_present ? "Yes" : "No"}
        </span>
        <button
          onClick={() => runBenchmark.mutate()}
          disabled={runBenchmark.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Gauge className="w-4 h-4" />
          {runBenchmark.isPending ? "Running…" : "Run Benchmarks"}
        </button>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">Hardware</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-muted-foreground">CPU</dt><dd className="font-medium">{hw.cpu_model ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">RAM (GB)</dt><dd className="font-medium">{hw.ram_gb ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">CUDA Device</dt><dd className="font-medium">{hw.cuda_device_name ?? "—"}</dd></div>
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">Simulation</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-muted-foreground font-medium">Trials</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Elapsed</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Trials/sec</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Backend</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(sim).map(([k, v]: [string, any]) => (
                  <tr key={k} className="border-b border-white/5">
                    <td className="py-3">{v?.n_trials ? `${v.n_companies ?? "—"} cos, ${v.n_trials} trials` : k}</td>
                    <td className="py-3">{v?.runtime_ms ?? v?.elapsed_sec ?? "—"}</td>
                    <td className="py-3 font-mono text-primary">{v?.trials_per_sec ?? "—"}</td>
                    <td className="py-3">{v?.backend ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!Object.keys(sim).length && <p className="text-muted-foreground mt-4">{benchmarks?.message ?? "No benchmark data."}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">Graph / Contagion</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-muted-foreground font-medium">Size</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Nodes / Edges</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Runtime (ms)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(graph).map(([k, v]: [string, any]) => (
                  <tr key={k} className="border-b border-white/5">
                    <td className="py-3">{v?.label ?? k}</td>
                    <td className="py-3">{v?.n_nodes ? `${v.n_nodes} / ${v.n_edges}` : v?.nodes ?? "—"}</td>
                    <td className="py-3">{v?.runtime_ms ?? v?.elapsed_sec ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">Deal Scoring Inference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-muted-foreground font-medium">Requests</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Elapsed</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Req/sec</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dealScoring).map(([k, v]: [string, any]) => (
                  <tr key={k} className="border-b border-white/5">
                    <td className="py-3">{v?.n_inferences ?? v?.n_requests ?? k}</td>
                    <td className="py-3">{v?.runtime_ms ?? v?.elapsed_sec ?? "—"}</td>
                    <td className="py-3 font-mono text-primary">{v?.inferences_per_sec ?? v?.requests_per_sec ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
