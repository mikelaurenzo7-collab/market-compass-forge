"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";

export default function EngineStatusPage() {
  const { api, user } = useAuth();

  const { data: health } = useQuery({
    queryKey: ["engine-health"],
    queryFn: () => api.getEngineHealth(),
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
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Engine Status</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Compute Backend</h2>
          <p className="text-slate-600">
            Backend: <strong>{health?.compute_backend ?? "numpy"}</strong>
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Set COMPUTE_BACKEND=cupy for GPU. Run engine/benchmarks/run_sim_bench.py for benchmarks.
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Latest Benchmarks</h2>
          {benchmarks?.benchmarks ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Trials</th>
                    <th className="text-left py-2">Elapsed (s)</th>
                    <th className="text-left py-2">Trials/sec</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(benchmarks.benchmarks).map(([n, b]: [string, any]) => (
                    <tr key={n} className="border-b">
                      <td className="py-2">{n}</td>
                      <td className="py-2">{b.elapsed_sec ?? "—"}</td>
                      <td className="py-2 font-mono">{b.trials_per_sec ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-600">{benchmarks?.message ?? "No benchmark data. Run run_sim_bench.py."}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
