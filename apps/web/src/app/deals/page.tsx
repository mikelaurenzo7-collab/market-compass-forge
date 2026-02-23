"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Target } from "lucide-react";

export default function DealsPage() {
  const { api, user } = useAuth();
  const [dealSize, setDealSize] = useState(50);
  const [entryMultiple, setEntryMultiple] = useState(8);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [scoring, setScoring] = useState(false);

  const { data: deals } = useQuery({
    queryKey: ["deals"],
    queryFn: () => api.listDeals(),
    enabled: !!user,
  });

  const runScore = async () => {
    setScoring(true);
    try {
      const r = await api.scoreDeal({
        deal_size: dealSize,
        entry_multiple: entryMultiple,
        revenue_growth: 0.15,
        leverage: 0.5,
        hold_period_years: 5,
      });
      setScoreResult(r);
    } catch (e) {
      console.error(e);
    } finally {
      setScoring(false);
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
      <h1 className="text-3xl font-bold text-foreground mb-2">Deal Scoring</h1>
      <p className="text-muted-foreground mb-10">Predictive exit probability and risk buckets</p>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Score a Deal
          </h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Deal Size ($M)</label>
              <input
                type="number"
                value={dealSize}
                onChange={(e) => setDealSize(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Entry Multiple</label>
              <input
                type="number"
                value={entryMultiple}
                onChange={(e) => setEntryMultiple(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground"
              />
            </div>
            <button
              onClick={runScore}
              disabled={scoring}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {scoring ? "Scoring..." : "Score Deal"}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Result
          </h2>
          {scoreResult ? (
            <div className="space-y-4">
              <div className="glass-card p-5">
                <p className="text-sm text-muted-foreground">Exit Probability</p>
                <p className="text-3xl font-bold text-primary">
                  {((scoreResult.exit_probability ?? 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="glass-card p-5">
                <p className="text-sm text-muted-foreground">Risk Bucket</p>
                <p className="text-xl font-semibold text-foreground">{scoreResult.risk_bucket ?? "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Enter deal parameters and click Score Deal.</p>
          )}
        </motion.div>
      </div>

      {deals && deals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 glass-card p-6"
        >
          <h2 className="font-semibold text-foreground mb-4">Deals</h2>
          <div className="space-y-2">
            {deals.map((d: any) => (
              <div key={d.id} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground text-sm">
                  ${d.deal_size ? d.deal_size.toLocaleString() : "—"} · {d.sector ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </Layout>
  );
}
