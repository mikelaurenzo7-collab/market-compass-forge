"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { motion } from "framer-motion";
import { Network, Zap, ArrowRight } from "lucide-react";

export default function GraphExplorerPage() {
  const { api, user } = useAuth();
  const [nodes, setNodes] = useState([{ id: "a", label: "Firm A" }, { id: "b", label: "Fund B" }, { id: "c", label: "LP C" }]);
  const [edges, setEdges] = useState([{ source: "a", target: "b", weight: 1 }, { source: "b", target: "c", weight: 1 }]);
  const [shocked, setShocked] = useState("a");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runContagion = async () => {
    setLoading(true);
    try {
      const r = await api.runContagion({
        nodes,
        edges,
        shocked_nodes: shocked.split(",").map((s) => s.trim()).filter(Boolean),
        shock_size: 1.0,
        decay: 0.5,
        steps: 5,
      });
      setResult(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary">Sign in</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-foreground mb-2">Capital Network Graph Explorer</h1>
      <p className="text-muted-foreground mb-10">Contagion simulation across relationship graphs</p>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Run Contagion Simulation
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Demo: 3 nodes (Firm A → Fund B → LP C). Shock node A and see propagation.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Shocked nodes (comma-separated)</label>
            <input
              type="text"
              value={shocked}
              onChange={(e) => setShocked(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="a,b"
            />
          </div>
          <button
            onClick={runContagion}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Network className="w-4 h-4" />
            {loading ? "Running..." : "Run Contagion"}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            Results
          </h2>
          {result ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="glass-card p-4 flex-1">
                  <p className="text-sm text-muted-foreground">Total risk</p>
                  <p className="text-2xl font-bold text-primary">{result.total_risk?.toFixed(2)}</p>
                </div>
                <div className="glass-card p-4 flex-1">
                  <p className="text-sm text-muted-foreground">Impacted nodes</p>
                  <p className="text-2xl font-bold text-primary">{result.num_impacted}</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Top impacted</p>
                <ul className="space-y-1">
                  {result.top_impacted_nodes?.slice(0, 10).map((n: any, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex justify-between">
                      <span>{n.node_id}</span>
                      <span className="font-mono text-primary">{n.risk?.toFixed(3)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Run a contagion simulation to see results.</p>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
