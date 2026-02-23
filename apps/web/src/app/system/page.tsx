"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cpu, Gauge, Zap, CheckCircle } from "lucide-react";

export default function SystemPage() {
  const { api, user } = useAuth();
  const { data: health } = useQuery({
    queryKey: ["engine-health"],
    queryFn: () => api.getEngineHealth(),
    enabled: !!user,
  });
  const { data: hardware } = useQuery({
    queryKey: ["engine-hardware"],
    queryFn: () => api.getEngineSystemHardware(),
    enabled: !!user,
  });
  const { data: benchmarks } = useQuery({
    queryKey: ["benchmarks"],
    queryFn: () => api.getBenchmarks(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary">Sign in</Link>
      </Layout>
    );
  }

  const hw = hardware || health || {};
  const benchData = benchmarks?.simulation || benchmarks?.benchmarks || benchmarks?.graph || benchmarks?.deal_scoring || {};
  const benchEntries = typeof benchData === "object" ? Object.entries(benchData) : [];

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-foreground mb-2">System</h1>
      <p className="text-muted-foreground mb-10">Engine hardware and compute status</p>

      <div className="flex flex-wrap gap-3 mb-8">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm font-medium">
          <Cpu className="w-4 h-4 text-primary" />
          Compute: {hw.compute_backend_effective ?? hw.compute_backend ?? "numpy"}
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm font-medium">
          Torch: {hw.torch_device_effective ?? hw.torch_device ?? "cpu"}
        </span>
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${hw.gpu_present ? "bg-primary/20 text-primary border border-primary/30" : "glass-card"}`}>
          <Zap className="w-4 h-4" />
          GPU: {hw.gpu_present ? "Present" : "Not detected"}
        </span>
        {hw.cuda_device_name && (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm font-medium">
            <CheckCircle className="w-4 h-4 text-primary" />
            {hw.cuda_device_name}
          </span>
        )}
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">Hardware Summary</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-muted-foreground">CPU</dt><dd className="font-medium">{hw.cpu_model ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">RAM (GB)</dt><dd className="font-medium">{hw.ram_gb ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">CuPy</dt><dd className="font-medium">{hw.cupy_available ? "Available" : "Not installed"}</dd></div>
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">GPU Smoke Test</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Run from project root: <code className="px-2 py-1 rounded-lg bg-white/10 font-mono text-sm">cd engine && python scripts/gpu_smoke_test.py</code>
          </p>
          <p className="text-sm text-muted-foreground">Prints PASS/FAIL for CuPy backend, 10k simulation, and Torch CUDA.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            Latest Benchmarks
          </h2>
          <Link href="/benchmarks" className="text-primary font-medium hover:underline text-sm">View full dashboard →</Link>
          {benchEntries.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-muted-foreground font-medium">Size</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Runtime (ms)</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Throughput</th>
                  </tr>
                </thead>
                <tbody>
                  {benchEntries.slice(0, 6).map(([k, v]: [string, any]) => (
                    <tr key={k} className="border-b border-white/5">
                      <td className="py-3">{k}</td>
                      <td className="py-3">{v?.runtime_ms ?? v?.elapsed_sec ?? "—"}</td>
                      <td className="py-3 font-mono text-primary">{v?.trials_per_sec ?? v?.inferences_per_sec ?? v?.requests_per_sec ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-4">No benchmark data. Run benchmarks from /benchmarks.</p>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
