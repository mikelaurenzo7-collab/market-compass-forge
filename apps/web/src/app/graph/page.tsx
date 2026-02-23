"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";

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
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Capital Network Graph Explorer</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Run Contagion Simulation</h2>
          <p className="text-sm text-slate-600 mb-4">
            Demo: 3 nodes (Firm A → Fund B → LP C). Shock node A and see propagation.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Shocked nodes (comma-separated)</label>
            <input
              type="text"
              value={shocked}
              onChange={(e) => setShocked(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="a,b"
            />
          </div>
          <button
            onClick={runContagion}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Contagion"}
          </button>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Results</h2>
          {result ? (
            <div className="space-y-2">
              <p><strong>Total risk:</strong> {result.total_risk?.toFixed(2)}</p>
              <p><strong>Impacted nodes:</strong> {result.num_impacted}</p>
              <p className="font-medium mt-4">Top impacted:</p>
              <ul className="list-disc pl-6">
                {result.top_impacted_nodes?.slice(0, 10).map((n: any, i: number) => (
                  <li key={i}>{n.node_id}: {n.risk?.toFixed(3)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-slate-600">Run a contagion simulation to see results.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
