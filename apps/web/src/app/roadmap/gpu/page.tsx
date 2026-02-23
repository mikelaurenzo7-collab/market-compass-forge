"use client";

import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cpu, Zap, Network, Layers } from "lucide-react";

export default function GpuRoadmapPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary">Sign in</Link>
      </Layout>
    );
  }

  const sections = [
    {
      icon: Cpu,
      title: "Current: CPU Vectorized Simulation",
      body: "Today we run Monte Carlo simulations on CPU using NumPy. All numeric kernels are isolated behind a ComputeBackend interface. Simulations are fully vectorized—100k+ trials in seconds. Graph analytics (centrality, exposure propagation, contagion) run on adjacency structures with NumPy for matrix ops.",
    },
    {
      icon: Zap,
      title: "CuPy Backend Path",
      body: "Set COMPUTE_BACKEND=cupy to swap NumPy for CuPy. Same code, GPU execution. Requires pip install cupy-cuda12x and a CUDA-capable GPU.",
      bullets: ["Correlated shock generation (Cholesky, matmul)", "Regime switching samplers", "Quantile summaries", "Timeline percentiles"],
    },
    {
      icon: Network,
      title: "RAPIDS / cuGraph Roadmap",
      body: "For large capital networks (10k+ nodes, 50k+ edges), we plan to integrate cuGraph for:",
      bullets: ["GPU-accelerated PageRank, betweenness centrality", "Exposure propagation on GPU adjacency", "Contagion simulation at scale"],
    },
    {
      icon: Layers,
      title: "Multi-GPU Distributed Roadmap",
      body: "For 1M+ trial simulations and very large graphs, we will support chunked execution across multiple GPUs via Dask-CUDA or Ray. Each chunk runs on a single GPU; results are aggregated server-side.",
    },
  ];

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-foreground mb-2">GPU Roadmap</h1>
      <p className="text-muted-foreground mb-10">Acceleration path from CPU to multi-GPU</p>

      <div className="max-w-3xl space-y-6">
        {sections.map((s, i) => (
          <motion.section
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-6"
          >
            <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <s.icon className="w-5 h-5 text-primary" />
              {s.title}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.body}</p>
            {s.bullets && (
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </motion.section>
        ))}
      </div>

      <Link href="/system" className="inline-block mt-8 text-primary font-medium hover:underline text-sm">← Back to System</Link>
    </Layout>
  );
}
