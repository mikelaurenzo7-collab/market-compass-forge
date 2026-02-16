import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketContextPanelProps {
  city: string;
  state: string;
  propertyType?: string | null;
}

const MarketContextPanel = ({ city, state, propertyType }: MarketContextPanelProps) => {
  const { data: marketData, isLoading } = useQuery({
    queryKey: ["market-context", city, state, propertyType],
    queryFn: async () => {
      let query = supabase
        .from("cre_market_data")
        .select("*")
        .eq("city", city)
        .eq("state", state)
        .order("period", { ascending: false })
        .limit(10);

      if (propertyType) {
        query = query.eq("property_type", propertyType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: recentTxns } = useQuery({
    queryKey: ["market-context-txns", city, state, propertyType],
    queryFn: async () => {
      let query = supabase
        .from("cre_transactions")
        .select("*")
        .eq("city", city)
        .eq("state", state)
        .order("transaction_date", { ascending: false })
        .limit(5);

      if (propertyType) {
        query = query.eq("property_type", propertyType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const latest = marketData?.[0];
  const hasData = marketData && marketData.length > 0;
  const hasTxns = recentTxns && recentTxns.length > 0;

  if (!hasData && !hasTxns) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Market Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No market data available for {city}, {state}</p>
        </CardContent>
      </Card>
    );
  }

  const fmtCurrency = (v: number | null) => {
    if (!v) return "—";
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Market Context — {city}, {state}
          {propertyType && <Badge variant="outline" className="text-[9px] ml-1">{propertyType}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest Market Stats */}
        {latest && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Latest ({latest.period}) — {latest.submarket}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2 bg-secondary/50 rounded">
                <p className="text-[10px] text-muted-foreground">Cap Rate</p>
                <p className="text-sm font-bold font-mono text-primary">{latest.cap_rate ? `${latest.cap_rate}%` : "—"}</p>
              </div>
              <div className="p-2 bg-secondary/50 rounded">
                <p className="text-[10px] text-muted-foreground">Vacancy</p>
                <p className="text-sm font-bold font-mono text-foreground">{latest.vacancy_rate ? `${latest.vacancy_rate}%` : "—"}</p>
              </div>
              <div className="p-2 bg-secondary/50 rounded">
                <p className="text-[10px] text-muted-foreground">Asking Rent</p>
                <p className="text-sm font-bold font-mono text-foreground">{latest.asking_rent ? `$${latest.asking_rent}/SF` : "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submarket Breakdown */}
        {hasData && marketData.length > 1 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Submarkets</p>
            <div className="space-y-1.5">
              {[...new Map(marketData.map(m => [m.submarket, m])).values()].slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium">{m.submarket}</span>
                  <div className="flex items-center gap-3 text-muted-foreground font-mono">
                    {m.cap_rate && <span>{m.cap_rate}% cap</span>}
                    {m.vacancy_rate && <span>{m.vacancy_rate}% vac</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Comparable Transactions */}
        {hasTxns && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Recent Comps
            </p>
            <div className="space-y-1.5">
              {recentTxns.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-foreground font-medium">{t.property_name}</span>
                    {t.submarket && <span className="text-muted-foreground ml-1">· {t.submarket}</span>}
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-foreground">{fmtCurrency(t.sale_price)}</span>
                    {t.cap_rate && <span className="text-primary">{t.cap_rate}%</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketContextPanel;
