import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

const PAGE_CONTEXT: Record<string, string> = {
  "/discover": "the Discover page where users surface companies, market events, distressed assets, and global opportunities worth opening a Deal Room for",
  "/deals": "the Deals overview showing capital lifecycle progress, active deals in diligence, velocity metrics, and recent IC decisions",
  "/deals/flow": "the Kanban pipeline view where deals are dragged between stages: Sourced → Screening → Due Diligence → IC Review → Committed → Passed",
  "/deals/recommended": "the AI Deal Matcher that analyzes pipeline patterns and recommends new opportunities based on sector, stage, and thesis fit",
  "/portfolio": "portfolio positions with thesis-vs-actuals tracking, MOIC, P&L, sector allocation, and benchmark comparisons against original IC rationale",
  "/decisions": "the Decision Journal — an audit trail of every stage change, IC vote, and commitment rationale across the entire deal pipeline",
  "/alerts": "alert rules monitoring sectors, funding events, SEC filings, and distressed assets with real-time notification delivery",
  "/settings": "account settings, team management, API keys, billing, integrations, and data import configuration",
  "/admin": "admin dashboard with team roles, activity logs, and workspace management",
  "/valuations": "valuation tools including DCF calculator, comparable company tables, and football field visualization",
  "/data-room": "data import hub for ingesting companies, financials, and contacts via CSV upload",
  "/help": "help center with FAQ about the Capital Lifecycle OS, Deal Rooms, and platform capabilities",
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
