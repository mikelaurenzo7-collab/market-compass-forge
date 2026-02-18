import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Scale, Plus, Trash2, Calculator, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface SalesComparisonProps {
  dealId: string;
}

const ADJ_FIELDS = [
  { key: "adj_location", label: "Location" },
  { key: "adj_age", label: "Age/Condition" },
  { key: "adj_condition", label: "Quality" },
  { key: "adj_size", label: "Size" },
  { key: "adj_amenities", label: "Amenities" },
] as const;

export default function SalesComparison({ dealId }: SalesComparisonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    comp_name: "",
    sale_price: "",
    sqft: "",
    price_per_sqft: "",
    sale_date: "",
    adj_location: "0",
    adj_age: "0",
    adj_condition: "0",
    adj_size: "0",
    adj_amenities: "0",
  });

  const { data: comps } = useQuery({
    queryKey: ["sales-comparisons", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_comparisons")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addComp = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const pricePerSqft = form.price_per_sqft
        ? parseFloat(form.price_per_sqft)
        : form.sale_price && form.sqft
        ? parseFloat(form.sale_price) / parseFloat(form.sqft)
        : 0;

      const { error } = await supabase.from("sales_comparisons").insert({
        deal_id: dealId,
        comp_name: form.comp_name,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        sqft: form.sqft ? parseFloat(form.sqft) : null,
        price_per_sqft: pricePerSqft,
        sale_date: form.sale_date || null,
        adj_location: parseFloat(form.adj_location) || 0,
        adj_age: parseFloat(form.adj_age) || 0,
        adj_condition: parseFloat(form.adj_condition) || 0,
        adj_size: parseFloat(form.adj_size) || 0,
        adj_amenities: parseFloat(form.adj_amenities) || 0,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-comparisons", dealId] });
      setAdding(false);
      setForm({ comp_name: "", sale_price: "", sqft: "", price_per_sqft: "", sale_date: "", adj_location: "0", adj_age: "0", adj_condition: "0", adj_size: "0", adj_amenities: "0" });
      toast.success("Comparable added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteComp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_comparisons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-comparisons", dealId] });
      toast.success("Comparable removed");
    },
  });

  // Compute average adjusted $/SF
  const avgAdjustedPSF = comps && comps.length > 0
    ? comps.reduce((s: number, c: any) => s + (c.adjusted_price_per_sqft ?? 0), 0) / comps.length
    : 0;

  return (
    <div className="rounded-lg border border-border bg-card space-y-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" /> Sales Comparison Approach
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-3 w-3" /> Add Comparable
        </button>
      </div>

      {/* Valuation Math */}
      <div className="px-4 py-3 border-b border-border/50 bg-primary/5">
        <div className="space-y-3">
          {/* Cap Rate */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Cap Rate:</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-foreground font-medium">R</span>
              <span className="text-muted-foreground">=</span>
              <div className="text-center border-b border-foreground/20 px-1.5">
                <span className="text-foreground font-medium">NOI</span>
              </div>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium">V</span>
            </div>
          </div>

          {/* NPV */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">NPV:</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-foreground font-medium">NPV</span>
              <span className="text-muted-foreground">=</span>
              <span className="text-foreground">Σ</span>
              <div className="text-center">
                <div className="text-foreground font-medium border-b border-foreground/20 px-1">
                  R<sub className="text-[9px]">t</sub>
                </div>
                <div className="text-muted-foreground text-[10px]">
                  (1 + i)<sup className="text-[9px]">t</sup>
                </div>
              </div>
              <span className="text-muted-foreground text-[10px] ml-1">
                where R<sub>t</sub> = net cash flow, i = discount rate
              </span>
            </div>
          </div>

          {/* Adjusted Value */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Adj. Value:</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-foreground font-medium">V̂</span>
              <span className="text-muted-foreground">=</span>
              <span className="text-foreground font-medium">$/SF<sub>comp</sub></span>
              <span className="text-muted-foreground">±</span>
              <span className="text-foreground">Σ Adj</span>
              <span className="text-muted-foreground">×</span>
              <span className="text-foreground font-medium">SF<sub>subject</sub></span>
            </div>
          </div>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="px-4 py-3 border-b border-border/50 bg-secondary/20 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Property Name *</label>
              <input value={form.comp_name} onChange={(e) => setForm({ ...form, comp_name: e.target.value })}
                className="w-full h-8 px-2.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="123 Main St" />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Sale Price ($)</label>
              <input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Sq Ft</label>
              <input type="number" value={form.sqft} onChange={(e) => setForm({ ...form, sqft: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">$/SF (or computed)</label>
              <input type="number" value={form.price_per_sqft} onChange={(e) => setForm({ ...form, price_per_sqft: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={form.sale_price && form.sqft ? `~${(parseFloat(form.sale_price) / parseFloat(form.sqft)).toFixed(0)}` : ""} />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Sale Date</label>
              <input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
                className="w-full h-8 px-2.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Adjustments ($/SF)</p>
          <div className="grid grid-cols-5 gap-2">
            {ADJ_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-[9px] text-muted-foreground block mb-1">{f.label}</label>
                <input type="number" value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full h-7 px-2 text-xs font-mono bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="h-7 px-3 text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={() => addComp.mutate()} disabled={!form.comp_name || addComp.isPending}
              className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              Add Comparable
            </button>
          </div>
        </div>
      )}

      {/* Comparison grid */}
      {comps && comps.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Property</th>
                <th className="text-right px-3 py-2 font-medium">Price</th>
                <th className="text-right px-3 py-2 font-medium">SF</th>
                <th className="text-right px-3 py-2 font-medium">$/SF</th>
                {ADJ_FIELDS.map((f) => (
                  <th key={f.key} className="text-right px-2 py-2 font-medium">{f.label}</th>
                ))}
                <th className="text-right px-3 py-2 font-medium text-primary">Adj $/SF</th>
                <th className="text-right px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c: any) => {
                const totalAdj = (c.adj_location ?? 0) + (c.adj_age ?? 0) + (c.adj_condition ?? 0) + (c.adj_size ?? 0) + (c.adj_amenities ?? 0);
                return (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-2 font-medium text-foreground">{c.comp_name}</td>
                    <td className="text-right px-3 py-2 font-mono text-foreground">{c.sale_price ? `$${(c.sale_price / 1e6).toFixed(2)}M` : "—"}</td>
                    <td className="text-right px-3 py-2 font-mono text-foreground">{c.sqft?.toLocaleString() ?? "—"}</td>
                    <td className="text-right px-3 py-2 font-mono text-foreground">${c.price_per_sqft?.toFixed(0) ?? "—"}</td>
                    {ADJ_FIELDS.map((f) => {
                      const v = c[f.key] ?? 0;
                      return (
                        <td key={f.key} className={`text-right px-2 py-2 font-mono ${v > 0 ? "text-success" : v < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {v > 0 ? "+" : ""}{v}
                        </td>
                      );
                    })}
                    <td className="text-right px-3 py-2 font-mono font-semibold text-primary">${c.adjusted_price_per_sqft?.toFixed(0) ?? "—"}</td>
                    <td className="text-right px-2 py-2">
                      <button onClick={() => deleteComp.mutate(c.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary row */}
          <div className="px-4 py-3 border-t border-border bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Indicated Value (Avg Adjusted $/SF):</span>
            </div>
            <span className="text-sm font-bold font-mono text-primary">${avgAdjustedPSF.toFixed(0)}/SF</span>
          </div>
        </div>
      ) : (
        !adding && (
          <div className="p-8 text-center">
            <Scale className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No comparable sales yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add comparable properties to build your sales comparison approach</p>
          </div>
        )
      )}
    </div>
  );
}
