import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Building, TrendingUp, MapPin, BarChart3, Home, DollarSign, Download } from "lucide-react";
import { ListingDetailPanel } from "@/components/ListingDetailPanel";
import { exportOffMarketListingsCSV } from "@/lib/export";

const formatCurrency = (v: number | null) => {
  if (!v) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
};

const RealEstateIntel = () => {
   const [propTypeFilter, setPropTypeFilter] = useState("all");
   const [cityFilter, setCityFilter] = useState("all");
   const [listingTypeFilter, setListingTypeFilter] = useState("all");
   const [listingPropFilter, setListingPropFilter] = useState("all");
   const [listingCityFilter, setListingCityFilter] = useState("all");
   const [selectedListing, setSelectedListing] = useState<any>(null);
   const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const { data: transactions, isLoading: txnLoading } = useQuery({
    queryKey: ["cre-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cre_transactions").select("*").order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: marketData, isLoading: mktLoading } = useQuery({
    queryKey: ["cre-market-data"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cre_market_data").select("*").order("period", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["private-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("private_listings").select("*").order("listed_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const propertyTypes = [...new Set((transactions ?? []).map((t) => t.property_type))];
  const cities = [...new Set((transactions ?? []).map((t) => t.city).filter(Boolean))].sort();
  const filteredTxns = (transactions ?? [])
    .filter((t) => propTypeFilter === "all" || t.property_type === propTypeFilter)
    .filter((t) => cityFilter === "all" || t.city === cityFilter);

  const totalVolume = filteredTxns.reduce((s, t) => s + (t.sale_price ?? 0), 0);
  const avgCapRate = filteredTxns.filter((t) => t.cap_rate).reduce((s, t) => s + (t.cap_rate ?? 0), 0) / (filteredTxns.filter((t) => t.cap_rate).length || 1);
  const avgPsf = filteredTxns.filter((t) => t.price_per_sf && t.price_per_sf < 10000).reduce((s, t) => s + (t.price_per_sf ?? 0), 0) / (filteredTxns.filter((t) => t.price_per_sf && t.price_per_sf < 10000).length || 1);

  const latestMarket = (marketData ?? []).filter((m) => m.period === "Q4 2024");
  const capRateByType = propertyTypes.map((pt) => {
    const items = latestMarket.filter((m) => m.property_type === pt);
    const avg = items.reduce((s, i) => s + (i.cap_rate ?? 0), 0) / (items.length || 1);
    return { type: pt, capRate: avg };
  });

  const officeTrend = (marketData ?? [])
    .filter((m) => m.property_type === "Office" && m.submarket === "West Loop")
    .map((m) => ({ period: m.period, vacancy: m.vacancy_rate, rent: m.asking_rent }));

  // Off-market listings
  const allListings = listings ?? [];
  const listingTypes = [...new Set(allListings.map((l) => l.listing_type))];
  const listingPropTypes = [...new Set(allListings.map((l) => l.property_type))];
  const listingCities = [...new Set(allListings.map((l) => l.city).filter(Boolean))].sort();
  const filteredListings = allListings
    .filter((l) => listingTypeFilter === "all" || l.listing_type === listingTypeFilter)
    .filter((l) => listingPropFilter === "all" || l.property_type === listingPropFilter)
    .filter((l) => listingCityFilter === "all" || l.city === listingCityFilter);

  const totalListings = filteredListings.length;
  const totalListingValue = filteredListings.reduce((s, l) => s + (l.asking_price ?? 0), 0);
  const avgListingCapRate = filteredListings.filter((l) => l.estimated_cap_rate).reduce((s, l) => s + (l.estimated_cap_rate ?? 0), 0) / (filteredListings.filter((l) => l.estimated_cap_rate).length || 1);

  const statusColor = (s: string) => {
    if (s === "available") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (s === "under_contract") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Real Estate Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-0.5">CRE market data, transactions & off-market listings</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Transaction Volume", value: formatCurrency(totalVolume), icon: Building },
          { label: "Avg Cap Rate", value: `${avgCapRate.toFixed(1)}%`, icon: TrendingUp },
          { label: "Avg Price/SF", value: `$${avgPsf.toFixed(0)}`, icon: BarChart3 },
          { label: "Off-Market Listings", value: allListings.length, icon: Home },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="pt-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold font-mono">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border">
          <TabsTrigger value="overview" className="text-xs">Market Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs">Transaction Log</TabsTrigger>
          <TabsTrigger value="submarkets" className="text-xs">Submarket Data</TabsTrigger>
          <TabsTrigger value="off-market" className="text-xs">Off-Market Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cap Rate by Property Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={capRateByType}>
                    <XAxis dataKey="type" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 10]} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="capRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Cap Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">West Loop Office Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={officeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="vacancy" stroke="hsl(var(--destructive))" strokeWidth={2} name="Vacancy %" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="rent" stroke="hsl(var(--primary))" strokeWidth={2} name="Asking Rent $/SF" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

         <TabsContent value="transactions">
           <div className="mb-4 flex gap-3">
             <Select value={propTypeFilter} onValueChange={setPropTypeFilter}>
               <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Property Types</SelectItem>
                 {propertyTypes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
               </SelectContent>
             </Select>
             <Select value={cityFilter} onValueChange={setCityFilter}>
               <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Cities" /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Cities</SelectItem>
                 {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
               </SelectContent>
             </Select>
           </div>

          {txnLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Date", "Property", "Type", "Submarket", "Size (SF)", "Sale Price", "$/SF", "Cap Rate", "Buyer"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTxns.map((t) => (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 px-3 font-mono text-xs">{t.transaction_date ?? "—"}</td>
                          <td className="py-2 px-3 text-xs font-medium">{t.property_name}</td>
                          <td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{t.property_type}</Badge></td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{t.submarket}</td>
                          <td className="py-2 px-3 font-mono text-xs">{t.size_sf?.toLocaleString() ?? "—"}</td>
                          <td className="py-2 px-3 font-mono text-xs">{formatCurrency(t.sale_price)}</td>
                          <td className="py-2 px-3 font-mono text-xs">{t.price_per_sf ? `$${t.price_per_sf.toLocaleString()}` : "—"}</td>
                          <td className="py-2 px-3 font-mono text-xs">{t.cap_rate ? `${t.cap_rate}%` : "—"}</td>
                          <td className="py-2 px-3 text-xs">{t.buyer ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="submarkets">
          {mktLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Q4 2024 Submarket Data</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Property Type", "Submarket", "Vacancy Rate", "Asking Rent", "Cap Rate"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {latestMarket.map((m) => (
                        <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{m.property_type}</Badge></td>
                          <td className="py-2 px-3 text-xs font-medium">{m.submarket}</td>
                          <td className="py-2 px-3 font-mono text-xs">{m.vacancy_rate ? `${m.vacancy_rate}%` : "—"}</td>
                          <td className="py-2 px-3 font-mono text-xs">{m.asking_rent ? `$${m.asking_rent}` : "—"}</td>
                          <td className="py-2 px-3 font-mono text-xs text-primary">{m.cap_rate ? `${m.cap_rate}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="off-market" className="space-y-4">
          {/* Off-market summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="border-border bg-card">
              <CardContent className="pt-3 flex items-center gap-3">
                <Home className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Active Listings</p>
                  <p className="text-lg font-bold font-mono">{totalListings}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-3 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Value</p>
                  <p className="text-lg font-bold font-mono">{formatCurrency(totalListingValue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-3 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Avg Cap Rate</p>
                  <p className="text-lg font-bold font-mono">{avgListingCapRate ? `${avgListingCapRate.toFixed(1)}%` : "—"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

           {/* Filters & Actions */}
           <div className="flex gap-3 flex-wrap justify-between items-center">
             <div className="flex gap-3 flex-wrap">
               <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
                 <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Listing Types" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Listing Types</SelectItem>
                   {listingTypes.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
                 </SelectContent>
               </Select>
               <Select value={listingPropFilter} onValueChange={setListingPropFilter}>
                 <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Property Types" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Property Types</SelectItem>
                   {listingPropTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                 </SelectContent>
               </Select>
               <Select value={listingCityFilter} onValueChange={setListingCityFilter}>
                 <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Cities" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Cities</SelectItem>
                   {listingCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <Button
               size="sm"
               variant="outline"
               onClick={() => exportOffMarketListingsCSV(filteredListings)}
               className="gap-2"
             >
               <Download className="h-4 w-4" />
               Export CSV
             </Button>
           </div>

          {listingsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Listed", "Type", "Property", "Location", "Asking Price", "Cap Rate", "NOI", "Size", "Status"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                       {filteredListings.map((l) => (
                         <tr
                           key={l.id}
                           className="border-b border-border/50 hover:bg-muted/20 cursor-pointer"
                           onClick={() => {
                             setSelectedListing(l);
                             setDetailPanelOpen(true);
                           }}
                         >
                           <td className="py-2 px-3 font-mono text-xs">{l.listed_date ?? "—"}</td>
                           <td className="py-2 px-3">
                             <Badge variant="outline" className="text-[10px]">
                               {l.listing_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                             </Badge>
                           </td>
                           <td className="py-2 px-3 text-xs font-medium">{l.property_type}</td>
                           <td className="py-2 px-3 text-xs text-muted-foreground">{l.city}, {l.state}</td>
                           <td className="py-2 px-3 font-mono text-xs">{formatCurrency(l.asking_price)}</td>
                           <td className="py-2 px-3 font-mono text-xs text-primary">{l.estimated_cap_rate ? `${l.estimated_cap_rate}%` : "—"}</td>
                           <td className="py-2 px-3 font-mono text-xs">{formatCurrency(l.noi)}</td>
                           <td className="py-2 px-3 font-mono text-xs">{l.size_sf ? `${l.size_sf.toLocaleString()} SF` : l.units ? `${l.units} units` : "—"}</td>
                           <td className="py-2 px-3">
                             <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${statusColor(l.status)}`}>
                               {l.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                             </span>
                           </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredListings.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">No listings match your criteria</div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
       </Tabs>

       <ListingDetailPanel
         listing={selectedListing}
         open={detailPanelOpen}
         onOpenChange={setDetailPanelOpen}
       />
     </div>
   );
 };
 
 export default RealEstateIntel;
