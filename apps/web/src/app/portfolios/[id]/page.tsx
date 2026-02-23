"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Play, Wallet } from "lucide-react";

export default function PortfolioDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { api, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [addForm, setAddForm] = useState({ company_id: "", cost_basis: 100, expected_exit_years: 5 });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/companies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("grapevine_token")}`,
          "X-Org-Id": localStorage.getItem("grapevine_org") || "",
        },
      });
      return res.json();
    },
    enabled: !!user,
  });

  const addPositionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/portfolios/${id}/positions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("grapevine_token")}`,
            "X-Org-Id": localStorage.getItem("grapevine_org") || "",
          },
          body: JSON.stringify({
            company_id: addForm.company_id,
            cost_basis: addForm.cost_basis,
            current_value: addForm.cost_basis,
            expected_exit_years: addForm.expected_exit_years,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio", id] });
      setShowAddPosition(false);
    },
  });

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => api.getPortfolio(id),
    enabled: !!user && !!id,
  });

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <Layout>
      <div className="mb-8">
        <Link href="/portfolios" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolios
        </Link>
      </div>
      {isLoading && <div className="glass-card p-8 animate-pulse h-32" />}
      {portfolio && (
        <>
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-muted-foreground mt-1">{portfolio.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPosition(!showAddPosition)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card hover:border-primary/30 transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Position
              </button>
              <Link
                href={`/simulations?portfolio=${id}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90"
              >
                <Play className="w-4 h-4" />
                Run Simulation
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold text-primary mt-1">${(portfolio.total_cost || 0).toLocaleString()}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-6"
            >
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-primary mt-1">${(portfolio.total_value || 0).toLocaleString()}</p>
            </motion.div>
          </div>
          {showAddPosition && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-8 glass-card p-6"
            >
              <h3 className="font-semibold text-foreground mb-4">Add Position</h3>
              <div className="flex gap-4 flex-wrap items-end">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Company</label>
                  <select
                    value={addForm.company_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, company_id: e.target.value }))}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select</option>
                    {companies?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Cost ($)</label>
                  <input
                    type="number"
                    value={addForm.cost_basis}
                    onChange={(e) => setAddForm((f) => ({ ...f, cost_basis: parseFloat(e.target.value) || 0 }))}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground w-28 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Exit (yrs)</label>
                  <input
                    type="number"
                    value={addForm.expected_exit_years}
                    onChange={(e) => setAddForm((f) => ({ ...f, expected_exit_years: parseFloat(e.target.value) || 5 }))}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground w-24 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={() => addPositionMutation.mutate()}
                  disabled={!addForm.company_id || addPositionMutation.isPending}
                  className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card overflow-hidden"
          >
            <h2 className="px-6 py-4 font-semibold text-foreground border-b border-white/10 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Positions
            </h2>
            {portfolio.positions?.length === 0 ? (
              <p className="p-8 text-muted-foreground text-center">No positions. Add companies to run simulations.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Company</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Cost</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Value</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Exit (yrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.positions?.map((pos: any) => (
                    <tr key={pos.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium">{pos.company_name || "—"}</td>
                      <td className="px-6 py-4 text-right">${pos.cost_basis?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">${pos.current_value?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">{pos.expected_exit_years}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        </>
      )}
    </Layout>
  );
}
