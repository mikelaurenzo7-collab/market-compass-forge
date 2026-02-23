"use client";

import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";

export default function GpuRoadmapPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">GPU Roadmap</h1>

      <div className="max-w-3xl space-y-8">
        <section className="bg-white rounded-lg border p-6">
          <h2 className="font-medium text-lg mb-4">Current: CPU Vectorized Simulation</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Today we run Monte Carlo simulations on CPU using NumPy. All numeric kernels are isolated behind a ComputeBackend interface. 
            Simulations are fully vectorized—100k+ trials in seconds. Graph analytics (centrality, exposure propagation, contagion) 
            run on adjacency structures with NumPy for matrix ops.
          </p>
        </section>

        <section className="bg-white rounded-lg border p-6">
          <h2 className="font-medium text-lg mb-4">CuPy Backend Path</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Set <code className="bg-slate-100 px-1 rounded">COMPUTE_BACKEND=cupy</code> to swap NumPy for CuPy. Same code, GPU execution. 
            Requires <code className="bg-slate-100 px-1 rounded">pip install cupy-cuda12x</code> and a CUDA-capable GPU.
          </p>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Correlated shock generation (Cholesky, matmul)</li>
            <li>Regime switching samplers</li>
            <li>Quantile summaries</li>
            <li>Timeline percentiles</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg border p-6">
          <h2 className="font-medium text-lg mb-4">RAPIDS / cuGraph Roadmap</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            For large capital networks (10k+ nodes, 50k+ edges), we plan to integrate cuGraph for:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>GPU-accelerated PageRank, betweenness centrality</li>
            <li>Exposure propagation on GPU adjacency</li>
            <li>Contagion simulation at scale</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg border p-6">
          <h2 className="font-medium text-lg mb-4">Multi-GPU Distributed Roadmap</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            For 1M+ trial simulations and very large graphs, we will support chunked execution across multiple GPUs 
            via Dask-CUDA or Ray. Each chunk runs on a single GPU; results are aggregated server-side.
          </p>
        </section>

        <div className="pt-4">
          <Link href="/system" className="text-slate-600 hover:text-slate-900 text-sm">← Back to System</Link>
        </div>
      </div>
    </Layout>
  );
}
