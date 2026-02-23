"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { useState } from "react";

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
      <div className="mb-6">
        <Link href="/portfolios" className="text-sm text-slate-600 hover:text-slate-900">
          ← Back to Portfolios
        </Link>
      </div>
      {isLoading && <p>Loading...</p>}
      {portfolio && (
        <>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-slate-600 mt-1">{portfolio.description}</p>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowAddPosition(!showAddPosition)}
                className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium"
              >
                Add Position
              </button>
              <Link
                href={`/simulations?portfolio=${id}`}
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 text-sm font-medium"
              >
                Run Simulation
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Total Cost</p>
              <p className="text-xl font-semibold">
                ${(portfolio.total_cost || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Total Value</p>
              <p className="text-xl font-semibold">
                ${(portfolio.total_value || 0).toLocaleString()}
              </p>
            </div>
          </div>
          {showAddPosition && (
            <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
              <h3 className="font-medium mb-3">Add Position</h3>
              <div className="flex gap-4 flex-wrap items-end">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Company</label>
                  <select
                    value={addForm.company_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, company_id: e.target.value }))}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="">Select</option>
                    {companies?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Cost ($)</label>
                  <input
                    type="number"
                    value={addForm.cost_basis}
                    onChange={(e) => setAddForm((f) => ({ ...f, cost_basis: parseFloat(e.target.value) || 0 }))}
                    className="px-3 py-2 border rounded-md w-24"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Exit (yrs)</label>
                  <input
                    type="number"
                    value={addForm.expected_exit_years}
                    onChange={(e) => setAddForm((f) => ({ ...f, expected_exit_years: parseFloat(e.target.value) || 5 }))}
                    className="px-3 py-2 border rounded-md w-20"
                  />
                </div>
                <button
                  onClick={() => addPositionMutation.mutate()}
                  disabled={!addForm.company_id || addPositionMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <h2 className="px-6 py-4 font-medium text-slate-900 border-b border-slate-200">
              Positions
            </h2>
            {portfolio.positions?.length === 0 ? (
              <p className="p-6 text-slate-600">No positions. Add companies to run simulations.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-700">Company</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-slate-700">Cost</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-slate-700">Value</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-slate-700">Exit (yrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.positions?.map((pos: any) => (
                    <tr key={pos.id} className="border-b border-slate-100">
                      <td className="px-6 py-3">{pos.company_name || "—"}</td>
                      <td className="px-6 py-3 text-right">${pos.cost_basis?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right">${pos.current_value?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right">{pos.expected_exit_years}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
