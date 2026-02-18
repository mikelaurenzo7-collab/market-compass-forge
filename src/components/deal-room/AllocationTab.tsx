import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatPercent } from "@/lib/format";
import LastModified from "@/components/LastModified";

interface AllocationTabProps {
  allocations: any[];
  dealId: string;
}

const AllocationTab = ({ allocations, dealId }: AllocationTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ allocation_type: "equity", amount: "", source_name: "", ownership_pct: "", commitment_date: "", notes: "" });

  const addAllocation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("deal_allocations").insert({
        deal_id: dealId, user_id: user.id, allocation_type: form.allocation_type,
        amount: form.amount ? parseFloat(form.amount) : null, source_name: form.source_name || null,
        ownership_pct: form.ownership_pct ? parseFloat(form.ownership_pct) : null,
        commitment_date: form.commitment_date || null, notes: form.notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-allocations", dealId] });
      setForm({ allocation_type: "equity", amount: "", source_name: "", ownership_pct: "", commitment_date: "", notes: "" });
      setShowForm(false);
      toast.success("Allocation added");
    },
  });

  const deleteAllocation = useMutation({
    mutationFn: async (allocId: string) => {
      const { error } = await supabase.from("deal_allocations").delete().eq("id", allocId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deal-allocations", dealId] }); toast.success("Allocation removed"); },
  });

  const totalAmount = allocations.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
  const totalOwnership = allocations.reduce((sum: number, a: any) => sum + (Number(a.ownership_pct) || 0), 0);

  const byType = allocations.reduce((acc: Record<string, number>, a: any) => {
    acc[a.allocation_type] = (acc[a.allocation_type] ?? 0) + (Number(a.amount) || 0);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Capital Stack</h3>
          <div className="flex items-center gap-3 mt-0.5">
            {totalAmount > 0 && <span className="text-xs text-muted-foreground">Total: <span className="font-mono tabular-nums text-primary">{formatCurrency(totalAmount)}</span></span>}
            {totalOwnership > 0 && <span className="text-xs text-muted-foreground">Ownership: <span className="font-mono tabular-nums text-foreground">{formatPercent(totalOwnership, 1)}</span></span>}
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
          <Plus className="h-3 w-3" /> Add Allocation
        </button>
      </div>

      {Object.keys(byType).length > 1 && (
        <div className="flex items-center gap-0.5 h-3 rounded-full overflow-hidden bg-secondary">
          {Object.entries(byType).map(([type, amount]) => {
            const amt = amount as number;
            const pct = totalAmount > 0 ? (amt / totalAmount) * 100 : 0;
            return (
              <div
                key={type}
                style={{ width: `${pct}%` }}
                className={`h-full ${type === "equity" ? "bg-primary" : type === "debt" ? "bg-warning" : type === "mezzanine" ? "bg-chart-4" : "bg-success"}`}
                title={`${type}: $${amount.toLocaleString()} (${pct.toFixed(0)}%)`}
              />
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <select value={form.allocation_type} onChange={(e) => setForm({ ...form, allocation_type: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground">
              <option value="equity">Equity</option><option value="debt">Debt</option><option value="mezzanine">Mezzanine</option><option value="preferred">Preferred</option>
            </select>
            <input type="number" placeholder="Amount ($)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="text" placeholder="Source / LP" value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="number" placeholder="Ownership %" value={form.ownership_pct} onChange={(e) => setForm({ ...form, ownership_pct: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="date" value={form.commitment_date} onChange={(e) => setForm({ ...form, commitment_date: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" />
            <button onClick={() => addAllocation.mutate()} disabled={addAllocation.isPending} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {addAllocation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save
            </button>
          </div>
        </div>
      )}

      {allocations.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Allocations Yet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">Track equity, debt, and mezzanine commitments. When capital is wired, it gets logged here.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium text-xs">Type</th>
              <th className="text-right px-4 py-2 font-medium text-xs">Amount</th>
              <th className="text-left px-4 py-2 font-medium text-xs">Source</th>
              <th className="text-right px-4 py-2 font-medium text-xs">Ownership</th>
              <th className="text-left px-4 py-2 font-medium text-xs">Date</th>
              <th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {allocations.map((a: any) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium capitalize">{a.allocation_type}</span></td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums text-foreground">{a.amount ? formatCurrency(Number(a.amount)) : "—"}</td>
                  <td className="px-4 py-2.5 text-foreground">{a.source_name ?? "—"}</td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums text-foreground">{a.ownership_pct ? formatPercent(a.ownership_pct) : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{a.commitment_date ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => deleteAllocation.mutate(a.id)} disabled={deleteAllocation.isPending} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all disabled:opacity-50">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <LastModified timestamp={a.created_at} userId={a.user_id} className="mt-1" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllocationTab;
