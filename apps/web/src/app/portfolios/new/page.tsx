"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Upload } from "lucide-react";

export default function NewPortfolioPage() {
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [qualityReport, setQualityReport] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { api, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => api.createPortfolio(name, description),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      router.push(`/portfolios/${p.id}`);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => api.uploadPortfolioCsv(file),
    onSuccess: (data) => {
      setUploadId(data.upload_id);
      setRows(data.rows || []);
      setQualityReport(data.quality_report || {});
    },
  });

  const createFromCsvMutation = useMutation({
    mutationFn: () => api.createPortfolioFromCsv({ name, description: description || undefined, create_from_upload_id: uploadId! }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      router.push(`/portfolios/${p.id}`);
    },
  });

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary">Sign in</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-foreground mb-2">New Portfolio</h1>
      <p className="text-muted-foreground mb-10">Create manually or upload from CSV</p>

      <div className="flex gap-3 mb-8">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            mode === "manual" ? "bg-primary text-primary-foreground" : "glass-card hover:border-primary/30"
          }`}
        >
          <FileText className="w-4 h-4" />
          Create Manually
        </button>
        <button
          type="button"
          onClick={() => setMode("csv")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            mode === "csv" ? "bg-primary text-primary-foreground" : "glass-card hover:border-primary/30"
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload CSV
        </button>
      </div>

      {mode === "manual" && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
          className="max-w-md space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </motion.form>
      )}

      {mode === "csv" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">CSV File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMutation.mutate(f);
              }}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:font-medium"
            />
            <p className="text-xs text-muted-foreground mt-2">Columns: company_name, sector, cost_basis, current_value, expected_exit_years, revenue_growth, leverage</p>
          </div>
          {uploadMutation.isSuccess && qualityReport && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Data Quality Report</h3>
              <p className="text-sm text-muted-foreground">Rows: {qualityReport.total_rows}</p>
              {qualityReport.missing_fields?.length > 0 && (
                <p className="text-sm text-amber-400 mt-1">Missing fields: {qualityReport.missing_fields.length} issues</p>
              )}
              {qualityReport.outliers?.length > 0 && (
                <p className="text-sm text-amber-400 mt-1">Outliers: {qualityReport.outliers.length}</p>
              )}
              {qualityReport.sectors_found?.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">Sectors: {qualityReport.sectors_found.join(", ")}</p>
              )}
            </div>
          )}
          {uploadId && rows.length > 0 && (
            <form
              onSubmit={(e) => { e.preventDefault(); createFromCsvMutation.mutate(); }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Portfolio Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={2}
                />
              </div>
              <p className="text-sm text-muted-foreground">{rows.length} positions will be created</p>
              <button
                type="submit"
                disabled={createFromCsvMutation.isPending}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {createFromCsvMutation.isPending ? "Creating..." : "Create Portfolio"}
              </button>
            </form>
          )}
        </motion.div>
      )}
    </Layout>
  );
}
