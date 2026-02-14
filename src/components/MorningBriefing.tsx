import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sun, Loader2, TrendingUp, AlertTriangle, Target, CheckCircle2, Sparkles, ChevronDown, ChevronUp, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type ActionItem = {
  action: string;
  priority: "high" | "medium" | "low";
  context: string;
};

type Briefing = {
  greeting: string;
  market_pulse: string;
  pipeline_update: string;
  opportunities: string;
  risks_watch: string;
  action_items: ActionItem[];
};

const PRIORITY_STYLES = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-primary/10 text-primary border-primary/20",
};

const SendTestEmailButton = () => {
  const [sending, setSending] = useState(false);

  const sendTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please sign in first"); return; }
      const resp = await supabase.functions.invoke("send-test-briefing", {});
      if (resp.error) throw resp.error;
      toast.success(`Test briefing sent to ${resp.data?.sent_to ?? "your email"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={sendTest}
      disabled={sending}
      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground uppercase tracking-wider hover:text-primary hover:underline disabled:opacity-50 transition-colors"
    >
      <Mail className="h-3 w-3" />
      {sending ? "Sending..." : "Send Test"}
    </button>
  );
};

const MorningBriefing = () => {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/morning-briefing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({}),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        if (resp.status === 429) {
          toast.error("Rate limit reached. Try again in a moment.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Please top up in workspace settings.");
        }
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const { briefing: data } = await resp.json();
      setBriefing(data);
    } catch (e: any) {
      setError(e.message || "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  };

  if (!briefing) {
    return (
      <div className="rounded-lg border border-border bg-gradient-to-br from-card to-primary/[0.03] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sun className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Morning Briefing</h3>
            <p className="text-[11px] text-muted-foreground">AI-powered overnight intelligence digest</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Get a personalized summary of overnight market moves, pipeline updates, new opportunities, and prioritized action items.
        </p>
        {error && <p className="text-xs text-destructive mb-3">{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing overnight data...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Briefing
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-gradient-to-br from-card to-primary/[0.03] overflow-hidden"
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-secondary/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Morning Briefing</h3>
        </div>
        <div className="flex items-center gap-2">
          <SendTestEmailButton />
          <button
            onClick={(e) => { e.stopPropagation(); generate(); }}
            disabled={loading}
            className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Greeting */}
            <div className="px-4 pb-3">
              <p className="text-sm text-foreground font-medium">{briefing.greeting}</p>
            </div>

            {/* Sections */}
            <div className="divide-y divide-border/50">
              {/* Market Pulse */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Market Pulse</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{briefing.market_pulse}</p>
              </div>

              {/* Pipeline */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="h-3.5 w-3.5 text-chart-4" />
                  <span className="text-[10px] font-semibold text-chart-4 uppercase tracking-wider">Pipeline Update</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{briefing.pipeline_update}</p>
              </div>

              {/* Opportunities */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-success" />
                  <span className="text-[10px] font-semibold text-success uppercase tracking-wider">Opportunities</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{briefing.opportunities}</p>
              </div>

              {/* Risks */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-[10px] font-semibold text-warning uppercase tracking-wider">Risks to Watch</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{briefing.risks_watch}</p>
              </div>

              {/* Action Items */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Today's Actions</span>
                </div>
                <div className="space-y-2">
                  {briefing.action_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase border ${PRIORITY_STYLES[item.priority]}`}>
                        {item.priority}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{item.action}</p>
                        <p className="text-[10px] text-muted-foreground">{item.context}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MorningBriefing;
