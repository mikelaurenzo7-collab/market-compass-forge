"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Chart3D } from "@/components/Chart3D";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";

export default function SimulationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { api, user } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);
  const [view3D, setView3D] = useState(false);

  const { data: sim } = useQuery({
    queryKey: ["simulation", id],
    queryFn: () => api.getSimulation(id),
    enabled: !!user && !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.status === "pending" || d?.status === "running" ? 2000 : false;
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (type: "pdf" | "csv") => {
      const res = await api.createExport(id, type);
      await api.downloadExport(res.export_id, `simulation_report.${type}`);
    },
    onMutate: (type) => setExporting(type),
    onSettled: () => setExporting(null),
  });

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary">Sign in</Link>
      </Layout>
    );
  }

  const results = sim?.results;
  const irrData = results?.irr_quantiles
    ? Object.entries(results.irr_quantiles).map(([p, v]) => ({ quantile: p, irr: (v as number) * 100 }))
    : [];

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-center">
        <Link
          href="/simulations"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        {sim?.status === "completed" && (
          <div className="flex gap-2">
            <button
              onClick={() => setView3D(!view3D)}
              className="px-4 py-2 rounded-xl glass-card text-sm font-medium hover:border-primary/30 transition-all"
            >
              {view3D ? "2D Chart" : "3D Chart"}
            </button>
            <button
              onClick={() => exportMutation.mutate("pdf")}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {exporting === "pdf" ? "Generating..." : "PDF"}
            </button>
            <button
              onClick={() => exportMutation.mutate("csv")}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm font-medium hover:border-primary/30 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exporting === "csv" ? "Generating..." : "CSV"}
            </button>
          </div>
        )}
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Simulation {id?.slice(0, 8)}...
      </h1>
      <p className="text-muted-foreground mb-8">Monte Carlo stress test results</p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 glass-card p-6"
      >
        <p className="font-medium text-foreground">Status: <span className="text-primary">{sim?.status}</span></p>
        {(sim?.status === "running" || sim?.status === "pending") && (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${sim?.percent_complete ?? 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {sim?.processed_trials ?? 0} / {sim?.total_trials ?? sim?.n_trials ?? 0} trials ({sim?.percent_complete ?? 0}%)
            </p>
          </div>
        )}
      </motion.div>

      {sim?.status === "failed" && (
        <div className="mb-8 glass-card p-6 border-destructive/30">
          <p className="font-medium text-destructive">Simulation failed</p>
          <p className="text-sm text-muted-foreground mt-1">{sim?.error_message ?? "Unknown error"}</p>
          <Link href="/simulations" className="text-sm text-primary hover:underline mt-2 inline-block">← Back to Simulation Lab</Link>
        </div>
      )}
      {results && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Mean IRR", value: ((results.mean_irr ?? 0) * 100).toFixed(1), suffix: "%" },
              { label: "VaR 95%", value: ((results.var_95 ?? 0) * 100).toFixed(1), suffix: "%" },
              { label: "CVaR 95%", value: ((results.cvar_95 ?? 0) * 100).toFixed(1), suffix: "%" },
              { label: "Downside (<10%)", value: ((results.downside_prob_below_threshold ?? 0) * 100).toFixed(1), suffix: "%" },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold text-primary mt-1">{m.value}{m.suffix}</p>
              </motion.div>
            ))}
          </div>
          {irrData.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="font-semibold text-foreground mb-4">IRR Distribution</h2>
              {view3D ? (
                <Chart3D data={irrData} />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={irrData} layout="vertical" margin={{ left: 40 }}>
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="quantile" width={40} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                        formatter={(v: number) => [`${v?.toFixed(1)}%`, "IRR"]}
                      />
                      <Bar dataKey="irr" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
