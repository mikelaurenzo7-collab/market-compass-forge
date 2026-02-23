"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";

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
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  const hw = hardware || health || {};
  const benchData = benchmarks?.simulation || benchmarks?.benchmarks || benchmarks?.graph || benchmarks?.deal_scoring || {};
  const benchEntries = typeof benchData === "object" ? Object.entries(benchData) : [];

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">System</h1>

      <div className="grid gap-4 mb-8">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
            Compute: {hw.compute_backend_effective ?? hw.compute_backend ?? "numpy"}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
            Torch: {hw.torch_device_effective ?? hw.torch_device ?? "cpu"}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${hw.gpu_present ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            GPU: {hw.gpu_present ? "Present" : "Not detected"}
          </span>
          {hw.cuda_device_name && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {hw.cuda_device_name}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Hardware Summary</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-600">CPU</dt>
            <dd>{hw.cpu_model ?? "—"}</dd>
            <dt className="text-slate-600">RAM (GB)</dt>
            <dd>{hw.ram_gb ?? "—"}</dd>
            <dt className="text-slate-600">CuPy</dt>
            <dd>{hw.cupy_available ? "Available" : "Not installed"}</dd>
          </dl>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">GPU Smoke Test</h2>
          <p className="text-sm text-slate-600 mb-4">
            Run from project root: <code className="bg-slate-100 px-1 rounded">cd engine && python scripts/gpu_smoke_test.py</code>
          </p>
          <p className="text-sm text-slate-600">Prints PASS/FAIL for CuPy backend, 10k simulation, and Torch CUDA.</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Latest Benchmarks</h2>
          <Link href="/benchmarks" className="text-slate-600 hover:text-slate-900 text-sm">View full dashboard →</Link>
          {benchEntries.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Size</th>
                    <th className="text-left py-2">Runtime (ms)</th>
                    <th className="text-left py-2">Throughput</th>
                  </tr>
                </thead>
                <tbody>
                  {benchEntries.slice(0, 6).map(([k, v]: [string, any]) => (
                    <tr key={k} className="border-b">
                      <td className="py-2">{k}</td>
                      <td className="py-2">{v?.runtime_ms ?? v?.elapsed_sec ?? "—"}</td>
                      <td className="py-2 font-mono">{v?.trials_per_sec ?? v?.inferences_per_sec ?? v?.requests_per_sec ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-2">No benchmark data. Run benchmarks from /benchmarks.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
