"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useDealPipelineStore } from "@/stores/deal-pipeline";
import type { Deal } from "@/types/deal";

export function CreateDealDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !targetCompany.trim()) return;

    setSubmitting(true);

    // In production, call createDeal Server Action here
    const newDeal: Deal = {
      id: `d-${Date.now()}`,
      name: name.trim(),
      target_company: targetCompany.trim(),
      status: "Teaser",
      created_at: new Date().toISOString(),
      sponsor_id: "mock-user",
    };

    addDeal(newDeal);
    toast.success("Deal created", {
      description: `${newDeal.target_company} added to Teaser`,
    });

    setName("");
    setTargetCompany("");
    setOpen(false);
    setSubmitting(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        New Deal
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              Create New Deal
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a deal to the Teaser column
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="deal-name"
                  className="text-sm font-medium text-foreground"
                >
                  Project Name
                </label>
                <input
                  id="deal-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project Atlas"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="target-company"
                  className="text-sm font-medium text-foreground"
                >
                  Target Company
                </label>
                <input
                  id="target-company"
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="Acme Corp"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
