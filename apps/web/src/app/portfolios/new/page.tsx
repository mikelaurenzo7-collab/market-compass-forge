"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

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
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">New Portfolio</h1>
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`px-4 py-2 rounded-md ${mode === "manual" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Create Manually
        </button>
        <button
          type="button"
          onClick={() => setMode("csv")}
          className={`px-4 py-2 rounded-md ${mode === "csv" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Upload CSV
        </button>
      </div>

      {mode === "manual" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="max-w-md space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {mode === "csv" && (
        <div className="max-w-2xl space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CSV File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMutation.mutate(f);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
            <p className="text-xs text-slate-500 mt-1">Columns: company_name, sector, cost_basis, current_value, expected_exit_years, revenue_growth, leverage</p>
          </div>
          {uploadMutation.isSuccess && qualityReport && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Data Quality Report</h3>
              <p className="text-sm">Rows: {qualityReport.total_rows}</p>
              {qualityReport.missing_fields?.length > 0 && (
                <p className="text-sm text-amber-600">Missing fields: {qualityReport.missing_fields.length} issues</p>
              )}
              {qualityReport.outliers?.length > 0 && (
                <p className="text-sm text-amber-600">Outliers: {qualityReport.outliers.length}</p>
              )}
              {qualityReport.sectors_found?.length > 0 && (
                <p className="text-sm">Sectors: {qualityReport.sectors_found.join(", ")}</p>
              )}
            </div>
          )}
          {uploadId && rows.length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createFromCsvMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  rows={2}
                />
              </div>
              <p className="text-sm text-slate-600">{rows.length} positions will be created</p>
              <button
                type="submit"
                disabled={createFromCsvMutation.isPending}
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
              >
                {createFromCsvMutation.isPending ? "Creating..." : "Create Portfolio"}
              </button>
            </form>
          )}
        </div>
      )}
    </Layout>
  );
}
