"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function NewPortfolioPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">New Portfolio</h1>
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
    </Layout>
  );
}
