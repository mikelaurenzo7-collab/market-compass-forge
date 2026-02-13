import { useState, useMemo, useEffect } from "react";
import { useDistressedAssets, formatCurrency } from "@/hooks/useData";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Building2, DollarSign, TrendingDown, Filter, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DistressedDetailPanel } from "@/components/DistressedDetailPanel";
import { exportDistressedAssetsCSV } from "@/lib/export";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  under_contract: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  sold: "bg-muted text-muted-foreground border-border",
};

const DistressedAssets = () => {
   const queryClient = useQueryClient();
   const { data: assets, isLoading } = useDistressedAssets();

   useEffect(() => {
     const channel = supabase
       .channel('distressed-realtime')
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'distressed_assets' }, (payload) => {
         queryClient.invalidateQueries({ queryKey: ["distressed-assets"] });
         toast.info(`New distressed listing: ${(payload.new as any)?.name ?? "Unknown"}`);
       })
       .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'distressed_assets' }, () => {
         queryClient.invalidateQueries({ queryKey: ["distressed-assets"] });
       })
       .subscribe();
     return () => { supabase.removeChannel(channel); };
   }, [queryClient]);
   const [typeFilter, setTypeFilter] = useState("all");
   const [distressFilter, setDistressFilter] = useState("all");
   const [stateFilter, setStateFilter] = useState("all");
   const [search, setSearch] = useState("");
   const [selectedAsset, setSelectedAsset] = useState<any>(null);
   const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const filtered = useMemo(() => {
    return (assets ?? []).filter((a) => {
      if (typeFilter !== "all" && a.asset_type !== typeFilter) return false;
      if (distressFilter !== "all" && a.distress_type !== distressFilter) return false;
      if (stateFilter !== "all" && a.location_state !== stateFilter) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [assets, typeFilter, distressFilter, stateFilter, search]);

  const activeCount = filtered.filter((a) => a.status === "active").length;
  const avgDiscount = filtered.length
    ? filtered.reduce((s, a) => s + (a.discount_pct ?? 0), 0) / filtered.length
    : 0;
  const medianPrice = (() => {
    const prices = filtered.map((a) => a.asking_price ?? 0).filter(Boolean).sort((a, b) => a - b);
    return prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  })();

  const states = [...new Set((assets ?? []).map((a) => a.location_state).filter(Boolean))].sort();
  const distressTypes = [...new Set((assets ?? []).map((a) => a.distress_type).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Distressed & Special Situations</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Distressed & Special Situations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Distressed businesses, foreclosed properties, and turnaround opportunities</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Total Listings</p>
              <p className="text-lg font-bold font-mono">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-3 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Avg Discount</p>
              <p className="text-lg font-bold font-mono text-destructive">{avgDiscount.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-3 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Active Opportunities</p>
              <p className="text-lg font-bold font-mono">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-3 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Median Price</p>
              <p className="text-lg font-bold font-mono">{formatCurrency(medianPrice)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

       {/* Mobile collapsible filters */}
       <details className="md:hidden" open>
         <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer mb-2">
           <Filter className="h-4 w-4" />
           <span>Filters</span>
         </summary>
         <div className="flex flex-col gap-3 mb-3">
           <input
             type="text" placeholder="Search listings..."
             value={search} onChange={(e) => setSearch(e.target.value)}
             className="h-8 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
           />
           <Select value={typeFilter} onValueChange={setTypeFilter}>
             <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Asset Type" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Types</SelectItem>
               <SelectItem value="business">Business</SelectItem>
               <SelectItem value="real_estate">Real Estate</SelectItem>
               <SelectItem value="loan">Loan/Note</SelectItem>
             </SelectContent>
           </Select>
           <Select value={distressFilter} onValueChange={setDistressFilter}>
             <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Distress Type" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Distress Types</SelectItem>
               {distressTypes.map((d) => (
                 <SelectItem key={d} value={d!}>{d!.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
               ))}
             </SelectContent>
           </Select>
           <Select value={stateFilter} onValueChange={setStateFilter}>
             <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="State" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All States</SelectItem>
               {states.map((s) => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
             </SelectContent>
           </Select>
           <Button size="sm" variant="outline" onClick={() => exportDistressedAssetsCSV(filtered)} className="gap-2">
             <Download className="h-4 w-4" /> Export CSV
           </Button>
         </div>
       </details>

       {/* Desktop filters */}
       <div className="hidden md:flex flex-wrap gap-3 items-center justify-between">
         <div className="flex flex-wrap gap-3 items-center">
           <input
             type="text" placeholder="Search listings..."
             value={search} onChange={(e) => setSearch(e.target.value)}
             className="h-8 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
           />
           <Select value={typeFilter} onValueChange={setTypeFilter}>
             <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Asset Type" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Types</SelectItem>
               <SelectItem value="business">Business</SelectItem>
               <SelectItem value="real_estate">Real Estate</SelectItem>
               <SelectItem value="loan">Loan/Note</SelectItem>
             </SelectContent>
           </Select>
           <Select value={distressFilter} onValueChange={setDistressFilter}>
             <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Distress Type" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Distress Types</SelectItem>
               {distressTypes.map((d) => (
                 <SelectItem key={d} value={d!}>{d!.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
               ))}
             </SelectContent>
           </Select>
           <Select value={stateFilter} onValueChange={setStateFilter}>
             <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="State" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All States</SelectItem>
               {states.map((s) => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
             </SelectContent>
           </Select>
         </div>
         <Button size="sm" variant="outline" onClick={() => exportDistressedAssetsCSV(filtered)} className="gap-2">
           <Download className="h-4 w-4" /> Export CSV
         </Button>
       </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium sticky left-0 bg-muted/30 z-10">Name</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Distress</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Location</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Asking Price</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Est. Value</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Discount</th>
                <th className="text-center py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
               {filtered.map((a) => (
                 <tr
                   key={a.id}
                   className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                   onClick={() => {
                     setSelectedAsset(a);
                     setDetailPanelOpen(true);
                   }}
                 >
                   <td className="py-2.5 px-3 font-medium text-foreground sticky left-0 bg-card z-10 min-w-[200px]">
                     <div>
                       <p className="text-sm">{a.name}</p>
                       {a.sector && <p className="text-[10px] text-muted-foreground">{a.sector}</p>}
                     </div>
                   </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className="text-[10px] capitalize">{a.asset_type?.replace('_', ' ')}</Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs text-muted-foreground capitalize">{a.distress_type?.replace('_', ' ')}</span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{a.location_city}, {a.location_state}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm text-foreground">{formatCurrency(a.asking_price)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm text-muted-foreground">{formatCurrency(a.estimated_value)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-mono text-sm font-bold text-destructive">{a.discount_pct}%</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${STATUS_STYLES[a.status] ?? ""}`}>
                      {a.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{a.source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         {filtered.length === 0 && (
           <div className="p-8 text-center text-muted-foreground text-sm">No distressed assets match your filters</div>
         )}
       </div>

       <DistressedDetailPanel
         asset={selectedAsset}
         open={detailPanelOpen}
         onOpenChange={setDetailPanelOpen}
       />
     </div>
   );
 };
 
 export default DistressedAssets;
