import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, RefreshCw, Loader2, CheckCircle2, AlertCircle, Clock, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type PipelineStatus = {
  name: string;
  description: string;
  lastRun: string | null;
  recordCount: number;
  functionName: string;
  body?: Record<string, any>;
};

const DataSourcesPanel = () => {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["data-sources-stats"],
    queryFn: async () => {
      const [secFacts, marketData, sectorMultiples, companies, macroCount, alphaSignals] = await Promise.all([
        supabase.from("sec_financial_facts").select("id", { count: "exact", head: true }),
        supabase.from("public_market_data").select("id, updated_at", { count: "exact" }).not("price", "is", null).limit(1),
        supabase.from("mv_sector_multiples").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("last_sec_fetch, last_market_fetch").eq("market_type", "public").not("last_sec_fetch", "is", null).order("last_sec_fetch", { ascending: false }).limit(1),
        supabase.from("macro_indicators").select("id", { count: "exact", head: true }),
        supabase.from("alpha_signals").select("generated_at").order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const latestMarket = await supabase
        .from("public_market_data")
        .select("updated_at")
        .not("price", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        secFactsCount: secFacts.count ?? 0,
        marketDataCount: marketData.count ?? 0,
        sectorMultiplesCount: sectorMultiples.count ?? 0,
        lastSecFetch: companies.data?.[0]?.last_sec_fetch ?? null,
        lastMarketFetch: latestMarket.data?.updated_at ?? null,
        macroCount: macroCount.count ?? 0,
        lastAlphaSignal: alphaSignals.data?.generated_at ?? null,
      };
    },
    refetchInterval: 30000,
  });

  const runPipeline = useMutation({
    mutationFn: async ({ functionName, body }: { functionName: string; body?: Record<string, any> }) => {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: body ?? {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["data-sources-stats"] });
      toast({
        title: "Pipeline complete",
        description: data?.message || `${variables.functionName} finished successfully`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Pipeline failed",
        description: err.message || "Check backend logs for details",
        variant: "destructive",
      });
    },
  });

  const pipelines: PipelineStatus[] = [
    {
      name: "SEC EDGAR XBRL",
      description: "Revenue, EBITDA, EPS, Balance Sheet — free, from SEC filings",
      lastRun: stats?.lastSecFetch ?? null,
      recordCount: stats?.secFactsCount ?? 0,
      functionName: "bulk-sec-ingest",
      body: { limit: 100 },
    },
    {
      name: "FMP Market Data",
      description: "Real-time prices, market cap, P/E, EV multiples",
      lastRun: stats?.lastMarketFetch ?? null,
      recordCount: stats?.marketDataCount ?? 0,
      functionName: "fetch-market-data",
      body: { limit: 50 },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Database className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Data Sources & Pipelines</h3>
      </div>

      <div className="grid gap-4">
        {pipelines.map((pipeline) => (
          <div key={pipeline.name} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{pipeline.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{pipeline.description}</p>
              </div>
              <button
                onClick={() => runPipeline.mutate({ functionName: pipeline.functionName, body: pipeline.body })}
                disabled={runPipeline.isPending}
                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors shrink-0"
              >
                {runPipeline.isPending && runPipeline.variables?.functionName === pipeline.functionName ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Refresh Now
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                {pipeline.recordCount > 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className="font-mono text-foreground">{pipeline.recordCount.toLocaleString()}</span>
                <span className="text-muted-foreground">records</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {pipeline.lastRun
                    ? `Updated ${formatDistanceToNow(new Date(pipeline.lastRun), { addSuffix: true })}`
                    : "Never run"}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Macro Indicators */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Macro Indicators</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Treasury yields, CPI, Fed Funds — seeded weekly</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              {(stats?.macroCount ?? 0) > 0 ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="font-mono text-foreground">{stats?.macroCount ?? 0}</span>
              <span className="text-muted-foreground">indicators</span>
            </div>
          </div>
        </div>

        {/* Alpha Signals */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Alpha Signals (AI)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">AI-generated sector valuation outlooks</p>
            </div>
            <button
              onClick={() => runPipeline.mutate({ functionName: "alpha-signals" })}
              disabled={runPipeline.isPending}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors shrink-0"
            >
              {runPipeline.isPending && runPipeline.variables?.functionName === "alpha-signals" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Generate
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {stats?.lastAlphaSignal
                  ? `Generated ${formatDistanceToNow(new Date(stats.lastAlphaSignal), { addSuffix: true })}`
                  : "Never generated"}
              </span>
            </div>
          </div>
        </div>

        {/* Sector Multiples (derived) */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Sector Multiples (Derived)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              EV/Revenue & EV/EBITDA benchmarks — auto-computed from SEC + FMP data
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              {(stats?.sectorMultiplesCount ?? 0) > 0 ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="font-mono text-foreground">{stats?.sectorMultiplesCount ?? 0}</span>
              <span className="text-muted-foreground">sectors with live benchmarks</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Refreshed automatically when SEC or FMP pipelines complete.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataSourcesPanel;
