import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

const PAGE_CONTEXT: Record<string, string> = {
  "/deals": "the deals overview showing pipeline status, active deals, and AI matches",
  "/companies": "the private companies database with valuations, funding rounds, and sector analysis",
  "/deals": "the deal pipeline showing sourced, screening, and due diligence stage deals",
  "/valuations": "the valuation tools including DCF calculator, comp tables, and football field charts",
  "/portfolio": "portfolio positions with MOIC, IRR tracking, and benchmark comparisons",
  "/intelligence": "intelligence signals feed with sentiment analysis and AI summaries",
  "/sector-pulse": "sector momentum dashboard tracking capital flow rotation patterns",
  "/screening": "company screening with multi-factor filters and saved screen templates",
  "/research": "research workspace with AI chat, document analysis, and SEC filings",
  "/distressed": "distressed asset opportunities with discount analysis",
  "/global": "global cross-border investment opportunities across regions",
  "/fund-intelligence": "fund performance analytics with IRR, TVPI, and LP commitment data",
  "/real-estate": "commercial real estate market data, transactions, and off-market listings",
};

/**
 * Floating AI copilot button that provides contextual page insights.
 */
export default function AICopilot() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [userQ, setUserQ] = useState("");

  const pageCtx = PAGE_CONTEXT[location.pathname] ?? "an investment intelligence page";

  const getInsight = useCallback(
    async (question?: string) => {
      setLoading(true);
      setInsight(null);
      try {
        const prompt = question
          ? `User is on ${pageCtx}. They ask: "${question}". Give a concise, actionable answer (max 3 sentences). Use financial terminology appropriate for PE/VC professionals.`
          : `User just opened ${pageCtx}. Give ONE concise, specific insight about what they should look at or a pattern you'd highlight on this page. Be specific about metrics, sectors, or trends. Max 2 sentences. Speak like a senior analyst.`;

        const { data, error } = await supabase.functions.invoke("ai-research", {
          body: { messages: [{ role: "user", content: prompt }] },
        });

        if (error) throw error;
        setInsight(data?.response ?? data?.content ?? "No insight available.");
      } catch {
        setInsight("Unable to generate insight right now. Try again shortly.");
      } finally {
        setLoading(false);
      }
    },
    [pageCtx]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQ.trim()) return;
    getInsight(userQ.trim());
    setUserQ("");
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => {
          setOpen((v) => {
            if (!v && !insight) getInsight();
            return !v;
          });
        }}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="AI Copilot"
      >
        <Sparkles className="h-5 w-5" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-50 w-80 max-h-[400px] rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">AI Copilot</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[100px]">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Analyzing page context…</span>
                </div>
              ) : insight ? (
                <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/90 leading-relaxed">
                  <ReactMarkdown>{insight}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ask anything about this page…</p>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-3 py-2 border-t border-border/50 flex items-center gap-2">
              <input
                value={userQ}
                onChange={(e) => setUserQ(e.target.value)}
                placeholder="Ask about this page…"
                className="flex-1 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !userQ.trim()}
                className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
