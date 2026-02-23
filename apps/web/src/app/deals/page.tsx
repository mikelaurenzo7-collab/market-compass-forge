"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";

export default function DealsPage() {
  const { api, user } = useAuth();
  const [form, setForm] = useState({
    deal_size: 20,
    entry_multiple: 8,
    revenue_growth: 0.15,
    leverage: 0.5,
    hold_period_years: 5,
    sector: "Technology",
  });
  const [result, setResult] = useState<any>(null);

  const runScore = async () => {
    try {
      const r = await api.scoreDeal(form);
      setResult(r);
    } catch (e) {
      console.error(e);
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
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Deal Scoring Engine</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Score a Deal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deal Size ($M)</label>
              <input
                type="number"
                value={form.deal_size}
                onChange={(e) => setForm((f) => ({ ...f, deal_size: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Entry Multiple</label>
              <input
                type="number"
                value={form.entry_multiple}
                onChange={(e) => setForm((f) => ({ ...f, entry_multiple: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Revenue Growth</label>
              <input
                type="number"
                step="0.01"
                value={form.revenue_growth}
                onChange={(e) => setForm((f) => ({ ...f, revenue_growth: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Leverage</label>
              <input
                type="number"
                step="0.01"
                value={form.leverage}
                onChange={(e) => setForm((f) => ({ ...f, leverage: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hold Period (years)</label>
              <input
                type="number"
                step="0.5"
                value={form.hold_period_years}
                onChange={(e) => setForm((f) => ({ ...f, hold_period_years: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
              <input
                type="text"
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <button
              onClick={runScore}
              className="w-full py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
            >
              Score Deal
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-medium mb-4">Results</h2>
          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">Exit Probability</p>
                  <p className="text-xl font-semibold">{(result.exit_probability * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-slate-50 rounded">
                  <p className="text-sm text-slate-600">Risk Bucket</p>
                  <p className={`text-xl font-semibold ${
                    result.risk_bucket === "low" ? "text-green-600" :
                    result.risk_bucket === "medium" ? "text-amber-600" : "text-red-600"
                  }`}>
                    {result.risk_bucket}
                  </p>
                </div>
              </div>
              {result.feature_contributions && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Feature Importance</p>
                  <ul className="text-sm space-y-1">
                    {Object.entries(result.feature_contributions)
                      .sort((a: any, b: any) => b[1] - a[1])
                      .map(([k, v]: [string, any]) => (
                        <li key={k}>{k}: {(v * 100).toFixed(1)}%</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-600">Enter deal parameters and click Score Deal.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
