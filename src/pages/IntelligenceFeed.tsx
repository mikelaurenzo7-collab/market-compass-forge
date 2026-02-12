import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, ExternalLink,
  Building2, Landmark, BarChart3, CreditCard, Globe, Briefcase,
  Users, FileText, Loader2, RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type SentimentType = "bullish" | "bearish" | "neutral";
type CategoryType = "pe_ma" | "real_estate" | "venture" | "credit" | "macro" | "personnel";

interface IntelItem {
  id: string;
  headline: string;
  source: string;
  created_at: string;
  ai_summary: string | null;
  tags: string[] | null;
  sentiment: string;
  category: string;
  url: string | null;
}

const CATEGORY_TABS: { value: CategoryType | "all"; label: string; icon: typeof Building2 }[] = [
  { value: "all", label: "All", icon: Globe },
  { value: "pe_ma", label: "PE & M&A", icon: Briefcase },
  { value: "real_estate", label: "Real Estate", icon: Building2 },
  { value: "venture", label: "Venture", icon: TrendingUp },
  { value: "credit", label: "Credit", icon: CreditCard },
  { value: "macro", label: "Macro", icon: Landmark },
  { value: "personnel", label: "People Moves", icon: Users },
];

const SentimentDot = ({ sentiment }: { sentiment: string }) => {
  const config: Record<string, { icon: typeof TrendingUp; label: string; className: string }> = {
    bullish: { icon: TrendingUp, label: "Bullish", className: "bg-success/10 text-success" },
    bearish: { icon: TrendingDown, label: "Bearish", className: "bg-destructive/10 text-destructive" },
    neutral: { icon: Minus, label: "Neutral", className: "bg-muted text-muted-foreground" },
  };
  const c = config[sentiment] ?? config.neutral;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${c.className}`}>
      <c.icon className="h-3 w-3" />
      {c.label}
    </span>
  );
};

const useIntelligenceSignals = () =>
  useQuery({
    queryKey: ["intelligence-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intelligence_signals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as IntelItem[];
    },
  });

const IntelligenceFeed = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryType | "all">("all");
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useIntelligenceSignals();

  const fetchSignals = useMutation({
    mutationFn: async (category?: string) => {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-intelligence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ category: category || null }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error);
      }
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intelligence-signals"] });
      toast.success("Intelligence signals updated with latest market data");
    },
    onError: (e) => {
      toast.error(String(e.message));
    },
  });

  const allItems = items ?? [];
  const filtered = activeCategory === "all"
    ? allItems
    : allItems.filter((i) => i.category === activeCategory);

  const sentimentCounts = allItems.reduce(
    (acc, i) => { acc[i.sentiment as SentimentType] = (acc[i.sentiment as SentimentType] || 0) + 1; return acc; },
    { bullish: 0, bearish: 0, neutral: 0 } as Record<SentimentType, number>
  );

  const lastUpdated = allItems.length > 0
    ? formatDistanceToNow(new Date(allItems[0].created_at), { addSuffix: true })
    : null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Intelligence Feed</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-curated private market intelligence and deal flow signals</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground hidden sm:block">Updated {lastUpdated}</span>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-mono text-success uppercase">Live</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
            <span className="text-success">{sentimentCounts.bullish}↑</span>
            <span className="text-muted-foreground">{sentimentCounts.neutral}→</span>
            <span className="text-destructive">{sentimentCounts.bearish}↓</span>
          </div>
          <button
            onClick={() => fetchSignals.mutate(activeCategory === "all" ? undefined : activeCategory)}
            disabled={fetchSignals.isPending}
            className="h-7 px-2 rounded text-[10px] font-mono text-primary uppercase tracking-wider hover:bg-primary/10 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {fetchSignals.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === tab.value
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-16 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-4 w-3/4 bg-muted rounded mb-2" />
              <div className="h-3 w-full bg-muted/60 rounded" />
              <div className="h-3 w-2/3 bg-muted/60 rounded mt-1" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border bg-card p-4 hover:border-primary/20 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <SentimentDot sentiment={item.sentiment} />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{item.source}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors mb-2">
                  {item.headline}
                </h3>
                {item.ai_summary && (
                  <p className="text-xs text-secondary-foreground leading-relaxed flex items-start gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    {item.ai_summary}
                  </p>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {item.tags.map((tag) => (
                      <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-1">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No intelligence signals yet</p>
          <button
            onClick={() => fetchSignals.mutate(activeCategory === "all" ? undefined : activeCategory)}
            disabled={fetchSignals.isPending}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {fetchSignals.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Fetch Real-Time Signals
          </button>
        </div>
      )}
    </div>
  );
};

export default IntelligenceFeed;
