import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, Newspaper,
  ArrowRight, Sparkles, ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type NewsArticle = {
  id: string;
  company_id: string | null;
  title: string;
  summary: string | null;
  ai_summary: string | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
  tags: string[] | null;
  created_at: string;
};

const SentimentIcon = ({ label }: { label: string | null }) => {
  if (label === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  if (label === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const SentimentBadge = ({ label, score }: { label: string | null; score: number | null }) => {
  const bg = label === "bullish" ? "bg-success/10 text-success" : label === "bearish" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${bg}`}>
      <SentimentIcon label={label} />
      {label?.toUpperCase() ?? "—"}
      {score !== null && <span className="opacity-70">({score > 0 ? "+" : ""}{Number(score).toFixed(1)})</span>}
    </span>
  );
};

interface NewsFeedProps {
  companyId?: string;
  compact?: boolean;
}

const NewsFeed = ({ companyId, compact = false }: NewsFeedProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const limit = compact ? 8 : 20;

  const { data: articles, isLoading } = useQuery({
    queryKey: ["news-articles", companyId, limit],
    queryFn: async () => {
      let q = supabase
        .from("news_articles")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(limit);
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as NewsArticle[];
    },
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("news-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "news_articles" }, () => {
        queryClient.invalidateQueries({ queryKey: ["news-articles"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ company_id: companyId ?? null, topic: "market-moving technology and finance news" }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error);
      }
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-articles"] });
      toast({ title: "News refreshed", description: "Latest articles loaded with sentiment analysis." });
    },
    onError: (e) => {
      toast({ title: "Failed to fetch news", description: String(e.message), variant: "destructive" });
    },
  });

  // Sentiment summary
  const sentimentCounts = (articles ?? []).reduce(
    (acc, a) => {
      if (a.sentiment_label === "bullish") acc.bullish++;
      else if (a.sentiment_label === "bearish") acc.bearish++;
      else acc.neutral++;
      return acc;
    },
    { bullish: 0, bearish: 0, neutral: 0 }
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">News Wire</h3>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-mono text-success uppercase">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sentiment summary pills */}
          {articles && articles.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              <span className="text-[10px] font-mono text-success">{sentimentCounts.bullish}↑</span>
              <span className="text-[10px] font-mono text-muted-foreground">{sentimentCounts.neutral}→</span>
              <span className="text-[10px] font-mono text-destructive">{sentimentCounts.bearish}↓</span>
            </div>
          )}
          <button
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending}
            className="h-7 px-2 rounded text-[10px] font-mono text-primary uppercase tracking-wider hover:bg-primary/10 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {fetchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Articles */}
      <div className="divide-y divide-border/50">
        {(articles ?? []).map((article) => (
          <div
            key={article.id}
            className="px-4 py-3 hover:bg-secondary/30 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SentimentBadge label={article.sentiment_label} score={article.sentiment_score} />
                  {article.source_name && (
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{article.source_name}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
                  {article.title}
                </p>
                {!compact && article.ai_summary && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                    <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    {article.ai_summary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">
                    {article.published_at ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true }) : "—"}
                  </span>
                  {article.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              {article.source_url && (
                <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-1">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
        {(!articles || articles.length === 0) && (
          <div className="p-8 text-center">
            <Newspaper className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No news articles yet</p>
            <button
              onClick={() => fetchMutation.mutate()}
              disabled={fetchMutation.isPending}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {fetchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Generate News Feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsFeed;
