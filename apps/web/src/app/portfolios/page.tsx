"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, TrendingUp, Wallet } from "lucide-react";

export default function PortfoliosPage() {
  const { api, user } = useAuth();
  const { data: portfolios, isLoading, error } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => api.listPortfolios(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in to continue
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfolios</h1>
          <p className="text-muted-foreground mt-1">Manage and analyze your investment portfolios</p>
        </div>
        <Link
          href="/portfolios/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Portfolio
        </Link>
      </div>
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse h-32" />
          ))}
        </div>
      )}
      {error && (
        <div className="glass-card p-6 border-destructive/30">
          <p className="text-destructive">Error loading portfolios</p>
        </div>
      )}
      {portfolios && portfolios.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-16 text-center"
        >
          <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground text-lg mb-6">No portfolios yet</p>
          <Link
            href="/portfolios/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Create your first portfolio
          </Link>
        </motion.div>
      )}
      {portfolios && portfolios.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((p: any, i: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/portfolios/${p.id}`}>
                <div className="glass-card p-6 hover:border-primary/30 hover:bg-white/[0.06] transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                      {p.name}
                    </h2>
                    <TrendingUp className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.position_count} positions
                  </p>
                  <p className="text-2xl font-bold text-primary mt-2">
                    ${(p.total_value || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">total value</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Layout>
  );
}
